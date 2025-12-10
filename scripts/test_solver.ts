
import { SudokuSolver } from '../src/features/sudoku/model/SudokuSolver.ts';

// Sample puzzle (Hard)
const puzzleStr = "000000000002060100800503009060090070504602301003000900706819503410000098000000000";
const puzzle = [];
for (let i = 0; i < 9; i++) {
    const row = [];
    for (let j = 0; j < 9; j++) {
        row.push(parseInt(puzzleStr[i * 9 + j]));
    }
    puzzle.push(row);
}

console.log("Testing SudokuSolver...");
const solver = new SudokuSolver(puzzle);
const hint = solver.getNextHint();

if (hint) {
    console.log("Hint found:");
    console.log(JSON.stringify(hint, null, 2));
} else {
    console.log("No hint found.");
}
