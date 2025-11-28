const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dataPath = path.join(__dirname, '../data/classified-puzzles.json');
const dbPath = path.join(__dirname, '../android/app/src/main/assets/sudoku_v2.db');

// Load data
console.log('Loading classified puzzles...');
const rawData = fs.readFileSync(dataPath, 'utf-8');
const allPuzzles = JSON.parse(rawData);

// Categorize
const buckets = {
    beginner: [],
    easy: [],
    medium: [],
    hard: [],
    expert: []
};

console.log('Categorizing puzzles...');
allPuzzles.forEach(p => {
    const zeros = p.board.split('0').length - 1;
    const clues = 81 - zeros;

    if (clues >= 40) {
        buckets.beginner.push(p);
    } else if (p.difficulty === 'easy') {
        buckets.easy.push(p);
    } else if (p.difficulty === 'medium') {
        buckets.medium.push(p);
    } else if (p.difficulty === 'hard') {
        buckets.hard.push(p);
    } else if (p.difficulty === 'hell') {
        buckets.expert.push(p);
    }
});

// Log counts
console.log('Puzzle counts per difficulty:');
Object.keys(buckets).forEach(diff => {
    console.log(`  ${diff}: ${buckets[diff].length}`);
});

// Initialize DB
console.log(`Creating database at ${dbPath}...`);
if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS puzzles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  difficulty INTEGER NOT NULL,
  puzzle TEXT NOT NULL,
  solution TEXT NOT NULL,
  line_no INTEGER
);
CREATE INDEX IF NOT EXISTS idx_puzzles_diff_id ON puzzles(difficulty, id);
CREATE TABLE IF NOT EXISTS difficulties (
  difficulty INTEGER PRIMARY KEY,
  min_id INTEGER NOT NULL,
  max_id INTEGER NOT NULL,
  count  INTEGER NOT NULL
);
`);

const insert = db.prepare(
    `INSERT INTO puzzles(difficulty, puzzle, solution, line_no) VALUES (@difficulty, @puzzle, @solution, @line_no)`
);

const insertDiff = db.prepare(`
INSERT INTO difficulties(difficulty, min_id, max_id, count)
VALUES (@difficulty, @min_id, @max_id, @count)
`);

const tx = db.transaction((items, diffInt) => {
    let minId = null;
    let maxId = null;
    let count = 0;

    for (const item of items) {
        const result = insert.run({
            difficulty: diffInt,
            puzzle: item.board,
            solution: item.solution,
            line_no: 0 // Not relevant here
        });

        if (minId === null) minId = result.lastInsertRowid;
        maxId = result.lastInsertRowid;
        count++;
    }

    if (count > 0) {
        insertDiff.run({
            difficulty: diffInt,
            min_id: minId,
            max_id: maxId,
            count: count
        });
    }
});

// Insert data
console.log('Inserting puzzles into database...');
// 0: Beginner, 1: Easy, 2: Medium, 3: Hard, 4: Expert
const diffMap = {
    beginner: 0,
    easy: 1,
    medium: 2,
    hard: 3,
    expert: 4
};

Object.keys(diffMap).forEach(diffKey => {
    const items = buckets[diffKey];
    const diffInt = diffMap[diffKey];

    if (items.length > 0) {
        console.log(`Inserting ${items.length} ${diffKey} (id=${diffInt}) puzzles...`);
        tx(items, diffInt);
    } else {
        console.warn(`No puzzles found for difficulty: ${diffKey}`);
    }
});

db.close();
console.log('Database rebuild complete.');
