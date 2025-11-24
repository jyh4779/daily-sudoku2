export type Difficulty = 'beginner' | 'easy' | 'medium' | 'hard' | 'expert';

type Cell = {
    value: number;
    candidates: Set<number>;
    row: number;
    col: number;
    box: number;
};

export class SudokuLogicSolver {
    private grid: Cell[];
    private history: string[] = [];
    private maxDifficultyFound: number = 0; // 0: Easy, 1: Medium, 2: Hard, 3: Expert

    constructor(boardString: string) {
        this.grid = this.parseBoard(boardString);
        // Initial candidate pruning
        this.updateCandidates();
    }

    private parseBoard(board: string): Cell[] {
        const clean = board.replace(/[^0-9.]/g, '').replace(/\./g, '0');
        const cells: Cell[] = [];
        for (let i = 0; i < 81; i++) {
            const val = parseInt(clean[i] || '0', 10);
            const row = Math.floor(i / 9);
            const col = i % 9;
            const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
            cells.push({
                value: val,
                candidates: val === 0 ? new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]) : new Set(),
                row,
                col,
                box,
            });
        }
        return cells;
    }

    private updateCandidates() {
        let changed = true;
        while (changed) {
            changed = false;
            for (const cell of this.grid) {
                if (cell.value !== 0) {
                    // Remove this value from peers
                    const peers = this.grid.filter(
                        c =>
                            c !== cell &&
                            c.value === 0 &&
                            (c.row === cell.row || c.col === cell.col || c.box === cell.box)
                    );
                    for (const peer of peers) {
                        if (peer.candidates.delete(cell.value)) {
                            // If a peer becomes empty, puzzle is invalid (ignore for now)
                        }
                    }
                }
            }
        }
    }

    public solveAndGrade(): { difficulty: Difficulty; log: string[] } {
        let progress = true;
        this.maxDifficultyFound = 0; // Start at Easy

        while (progress && !this.isSolved()) {
            progress = false;

            // 1. Naked Singles (Easy)
            if (this.applyNakedSingles()) {
                progress = true;
                continue;
            }

            // 2. Hidden Singles (Easy)
            if (this.applyHiddenSingles()) {
                progress = true;
                continue;
            }

            // 3. Locked Candidates (Medium)
            if (this.applyLockedCandidates()) {
                this.maxDifficultyFound = Math.max(this.maxDifficultyFound, 1);
                progress = true;
                continue;
            }

            // 4. Naked Pairs (Medium)
            if (this.applyNakedPairs()) {
                this.maxDifficultyFound = Math.max(this.maxDifficultyFound, 1);
                progress = true;
                continue;
            }

            // 5. Hidden Pairs (Hard) - Simplified implementation
            if (this.applyHiddenPairs()) {
                this.maxDifficultyFound = Math.max(this.maxDifficultyFound, 2);
                progress = true;
                continue;
            }

            // If we are here, we are stuck or need harder techniques
            // For this estimator, if not solved, we assume Expert
            break;
        }

        const solved = this.isSolved();
        let finalDiff: Difficulty = 'expert';

        if (solved) {
            if (this.maxDifficultyFound === 0) finalDiff = 'easy';
            else if (this.maxDifficultyFound === 1) finalDiff = 'medium';
            else if (this.maxDifficultyFound === 2) finalDiff = 'hard';
            else finalDiff = 'expert';
        } else {
            finalDiff = 'expert'; // Couldn't solve with implemented techniques
        }

        // Heuristic adjustment for "Beginner" (Very Easy)
        // If solved purely by singles and had many clues initially
        if (finalDiff === 'easy') {
            const clueCount = this.grid.filter(c => c.value !== 0).length; // This is end state, need initial count?
            // Actually, let's just stick to logic. Easy is Easy.
        }

        return { difficulty: finalDiff, log: this.history };
    }

    private isSolved(): boolean {
        return this.grid.every(c => c.value !== 0);
    }

    // --- Techniques ---

    private applyNakedSingles(): boolean {
        let found = false;
        for (const cell of this.grid) {
            if (cell.value === 0 && cell.candidates.size === 1) {
                const val = Array.from(cell.candidates)[0];
                cell.value = val;
                cell.candidates.clear();
                this.updateCandidates(); // Propagate constraint
                found = true;
            }
        }
        return found;
    }

    private applyHiddenSingles(): boolean {
        let found = false;
        const units = [
            ...this.getUnits('row'),
            ...this.getUnits('col'),
            ...this.getUnits('box'),
        ];

        for (const unit of units) {
            const counts: { [key: number]: Cell[] } = {};
            for (const cell of unit) {
                if (cell.value === 0) {
                    cell.candidates.forEach(c => {
                        if (!counts[c]) counts[c] = [];
                        counts[c].push(cell);
                    });
                }
            }

            for (const numStr in counts) {
                const num = parseInt(numStr);
                if (counts[num].length === 1) {
                    const target = counts[num][0];
                    target.value = num;
                    target.candidates.clear();
                    this.updateCandidates();
                    found = true;
                    // Restart to propagate immediately
                    return true;
                }
            }
        }
        return found;
    }

    private applyLockedCandidates(): boolean {
        // Pointing Pairs/Triples
        // If in a box, all candidates for 'n' are in the same row/col, remove 'n' from rest of row/col
        let changed = false;
        for (let b = 0; b < 9; b++) {
            const boxCells = this.grid.filter(c => c.box === b && c.value === 0);
            for (let n = 1; n <= 9; n++) {
                const candidates = boxCells.filter(c => c.candidates.has(n));
                if (candidates.length >= 2 && candidates.length <= 3) {
                    const rows = new Set(candidates.map(c => c.row));
                    const cols = new Set(candidates.map(c => c.col));

                    if (rows.size === 1) {
                        const r = Array.from(rows)[0];
                        const peers = this.grid.filter(c => c.row === r && c.box !== b && c.value === 0);
                        for (const p of peers) {
                            if (p.candidates.delete(n)) changed = true;
                        }
                    }
                    if (cols.size === 1) {
                        const colVal = Array.from(cols)[0];
                        const peers = this.grid.filter(cell => cell.col === colVal && cell.box !== b && cell.value === 0);
                        for (const p of peers) {
                            if (p.candidates.delete(n)) changed = true;
                        }
                    }
                }
            }
        }
        return changed;
    }

    private applyNakedPairs(): boolean {
        let changed = false;
        const units = [
            ...this.getUnits('row'),
            ...this.getUnits('col'),
            ...this.getUnits('box'),
        ];

        for (const unit of units) {
            // Find cells with exactly 2 candidates
            const pairs = unit.filter(c => c.value === 0 && c.candidates.size === 2);
            for (let i = 0; i < pairs.length; i++) {
                for (let j = i + 1; j < pairs.length; j++) {
                    const c1 = pairs[i];
                    const c2 = pairs[j];
                    const cand1 = Array.from(c1.candidates).sort().join('');
                    const cand2 = Array.from(c2.candidates).sort().join('');

                    if (cand1 === cand2) {
                        // Found Naked Pair
                        const [n1, n2] = Array.from(c1.candidates);
                        // Remove n1, n2 from other cells in unit
                        for (const other of unit) {
                            if (other !== c1 && other !== c2 && other.value === 0) {
                                let mod = false;
                                if (other.candidates.delete(n1)) mod = true;
                                if (other.candidates.delete(n2)) mod = true;
                                if (mod) changed = true;
                            }
                        }
                    }
                }
            }
        }
        return changed;
    }

    private applyHiddenPairs(): boolean {
        // Simplified: Just check if 2 numbers appear ONLY in 2 cells within a unit
        // This is computationally more expensive, implementing basic version
        let changed = false;
        const units = [
            ...this.getUnits('row'),
            ...this.getUnits('col'),
            ...this.getUnits('box'),
        ];

        for (const unit of units) {
            const counts: { [key: number]: Cell[] } = {};
            for (const cell of unit) {
                if (cell.value === 0) {
                    cell.candidates.forEach(c => {
                        if (!counts[c]) counts[c] = [];
                        counts[c].push(cell);
                    });
                }
            }

            // Find numbers that appear exactly twice
            const candidatesAppearingTwice = Object.keys(counts)
                .map(Number)
                .filter(n => counts[n].length === 2);

            for (let i = 0; i < candidatesAppearingTwice.length; i++) {
                for (let j = i + 1; j < candidatesAppearingTwice.length; j++) {
                    const n1 = candidatesAppearingTwice[i];
                    const n2 = candidatesAppearingTwice[j];
                    const cells1 = counts[n1];
                    const cells2 = counts[n2];

                    // Check if they are the same cells
                    if (cells1[0] === cells2[0] && cells1[1] === cells2[1]) {
                        // Found Hidden Pair (n1, n2) in cells1
                        const cellA = cells1[0];
                        const cellB = cells1[1];

                        // Clear other candidates from these two cells
                        // If they have other candidates, removing them is the progress
                        if (cellA.candidates.size > 2 || cellB.candidates.size > 2) {
                            const toKeep = new Set([n1, n2]);

                            // Cell A
                            for (const c of Array.from(cellA.candidates)) {
                                if (!toKeep.has(c)) {
                                    cellA.candidates.delete(c);
                                    changed = true;
                                }
                            }
                            // Cell B
                            for (const c of Array.from(cellB.candidates)) {
                                if (!toKeep.has(c)) {
                                    cellB.candidates.delete(c);
                                    changed = true;
                                }
                            }
                        }
                    }
                }
            }
        }
        return changed;
    }

    private getUnits(type: 'row' | 'col' | 'box'): Cell[][] {
        const units: Cell[][] = [];
        for (let i = 0; i < 9; i++) {
            units.push(this.grid.filter(c => c[type] === i));
        }
        return units;
    }
}
