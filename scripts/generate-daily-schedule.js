const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '../android/app/src/main/assets/sudoku_v2.db');

if (!require('fs').existsSync(dbPath)) {
    console.error('Database file not found at:', dbPath);
    process.exit(1);
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

console.log('Opening database:', dbPath);

// 1. Create daily_schedule table
db.exec(`
    CREATE TABLE IF NOT EXISTS daily_schedule (
        date TEXT PRIMARY KEY,
        puzzle_id INTEGER,
        difficulty_int INTEGER,
        difficulty_str TEXT
    )
`);

console.log('Table daily_schedule ensured.');

// 2. Define schedule rules
// 0: Sun, 1: Mon, ..., 6: Sat
const getDifficultyForDay = (dayOfWeek) => {
    if (dayOfWeek === 0) return { int: 4, str: 'expert' }; // Sun
    if (dayOfWeek >= 1 && dayOfWeek <= 3) return { int: 0, str: 'beginner' }; // Mon-Wed
    return { int: 2, str: 'medium' }; // Thu-Sat
};

// 3. Generate schedule
const startDate = new Date(); // Start from today
const endDate = new Date('2026-12-31');

console.log(`Generating schedule from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}...`);

const insertStmt = db.prepare('INSERT OR REPLACE INTO daily_schedule (date, puzzle_id, difficulty_int, difficulty_str) VALUES (?, ?, ?, ?)');
const getPuzzleStmt = db.prepare('SELECT id FROM puzzles WHERE difficulty = ? ORDER BY RANDOM() LIMIT 1');

let currentDate = new Date(startDate);
let count = 0;

const transaction = db.transaction(() => {
    while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayOfWeek = currentDate.getDay();
        const { int: diffInt, str: diffStr } = getDifficultyForDay(dayOfWeek);

        // Get a random puzzle of this difficulty
        const puzzle = getPuzzleStmt.get(diffInt);

        if (puzzle) {
            insertStmt.run(dateStr, puzzle.id, diffInt, diffStr);
            count++;
        } else {
            console.warn(`No puzzle found for difficulty ${diffStr} (${diffInt}) on ${dateStr}`);
        }

        // Next day
        currentDate.setDate(currentDate.getDate() + 1);
    }
});

transaction();

console.log(`Successfully generated ${count} daily puzzles.`);

// Verify
const verifyCount = db.prepare('SELECT COUNT(*) as c FROM daily_schedule').get();
console.log(`Total rows in daily_schedule: ${verifyCount.c}`);

db.close();
