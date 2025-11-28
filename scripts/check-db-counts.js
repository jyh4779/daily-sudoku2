const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '../android/app/src/main/assets/sudoku.db');

if (!require('fs').existsSync(dbPath)) {
    console.error('Database file not found at:', dbPath);
    process.exit(1);
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

console.log('--- Puzzle Counts by Difficulty ---');

// Method 1: Query the difficulties table (metadata)
console.log('\n[Metadata Table]');
const metaRows = db.prepare('SELECT * FROM difficulties').all();
if (metaRows.length === 0) {
    console.log('No metadata found.');
} else {
    console.table(metaRows);
}

// Method 2: Count actual rows in puzzles table
console.log('\n[Actual Row Counts]');
const actualRows = db.prepare('SELECT difficulty, COUNT(*) as count FROM puzzles GROUP BY difficulty').all();
console.table(actualRows);

db.close();
