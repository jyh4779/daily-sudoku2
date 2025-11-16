const fs = require('fs');
const Database = require('better-sqlite3');

const dbFile = process.argv[2];
const difficulty = process.argv[3];        // e.g., 'easy'
const puzzlePath = process.argv[4];        // e.g., 'Easy.sudoku'
const solutionPath = process.argv[5];      // e.g., 'Easy_output.sudoku'
const append = process.argv.includes('--append');

if (!dbFile || !difficulty || !puzzlePath || !solutionPath) {
  console.error('Usage: node scripts/build-puzzles-db.js <dbFile> <difficulty> <puzzles> <solutions> [--append]');
  process.exit(1);
}

const readLines = (p) =>
  fs.readFileSync(p, 'utf8')
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean);

const puzzles = readLines(puzzlePath);
const solutions = readLines(solutionPath);
if (puzzles.length !== solutions.length) {
  console.warn(`Count mismatch: puzzles=${puzzles.length}, solutions=${solutions.length} -> using min length`);
}
const n = Math.min(puzzles.length, solutions.length);

const db = new Database(dbFile);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS puzzles (
  id INTEGER PRIMARY KEY,
  difficulty TEXT NOT NULL,
  puzzle TEXT NOT NULL,
  solution TEXT NOT NULL,
  line_no INTEGER
);
CREATE INDEX IF NOT EXISTS idx_puzzles_diff_id ON puzzles(difficulty, id);
CREATE TABLE IF NOT EXISTS difficulties (
  difficulty TEXT PRIMARY KEY,
  min_id INTEGER NOT NULL,
  max_id INTEGER NOT NULL,
  count  INTEGER NOT NULL
);
`);

const insert = db.prepare(
  `INSERT INTO puzzles(difficulty, puzzle, solution, line_no) VALUES (@difficulty, @puzzle, @solution, @line_no)`
);

const tx = db.transaction((rows) => {
  for (const r of rows) insert.run(r);
});

const normPuzzle = (s) => s.replace(/[^0-9.]/g, '').slice(0,81).padEnd(81,'0');
const normSolution = (s) => s.replace(/[^0-9]/g, '').slice(0,81).padEnd(81,'0');

const rows = [];
for (let i = 0; i < n; i++) {
  rows.push({
    difficulty,
    puzzle: normPuzzle(puzzles[i]),
    solution: normSolution(solutions[i]),
    line_no: i + 1
  });
}
tx(rows);

// difficulties 업데이트
const { min_id } = db.prepare(`SELECT MIN(id) AS min_id FROM puzzles WHERE difficulty=?`).get(difficulty);
const { max_id } = db.prepare(`SELECT MAX(id) AS max_id FROM puzzles WHERE difficulty=?`).get(difficulty);
const { cnt }    = db.prepare(`SELECT COUNT(*) AS cnt  FROM puzzles WHERE difficulty=?`).get(difficulty);

db.prepare(`
INSERT INTO difficulties(difficulty, min_id, max_id, count)
VALUES (@difficulty, @min_id, @max_id, @count)
ON CONFLICT(difficulty) DO UPDATE SET
  min_id=excluded.min_id, max_id=excluded.max_id, count=excluded.count
`).run({ difficulty, min_id, max_id, count: cnt });

console.log(`Done: ${difficulty} -> rows=${n}, id=[${min_id}..${max_id}], count=${cnt}`);
db.close();