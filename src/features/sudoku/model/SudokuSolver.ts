
export type HintType =
    | 'Naked Single'
    | 'Hidden Single'
    | 'Naked Pair'
    | 'Naked Triple'
    | 'Hidden Pair'
    | 'Hidden Triple'
    | 'Pointing'
    | 'Claiming'
    | 'X-Wing'
    | 'Y-Wing'
    | 'None';

export interface HintDetails {
    type: HintType;
    difficulty: number; // 0: Beginner, 1: Easy, 2: Medium, 3: Hard, 4: Expert
    description: string;
    cell?: number; // Index 0-80
    val?: number;
    candidates?: number[];
    cells?: number[];
    eliminations?: number[]; // Indices where candidates are removed
    relatedCells?: number[]; // Cells to highlight in red (e.g. pair members)
    relatedRegions?: { type: 'row' | 'col' | 'box'; index: number }[]; // Regions to highlight in light red
}

export class SudokuSolver {
    grid: number[];
    candidates: Set<number>[];
    rows: number[][];
    cols: number[][];
    boxes: number[][];
    units: number[][];
    peers: Set<number>[];

    constructor(puzzle: number[][]) {
        // Flatten 9x9 to 1D array of 81
        this.grid = puzzle.flat();
        this.candidates = this.grid.map(val =>
            val === 0 ? new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]) : new Set<number>()
        );

        // Precompute groups
        this.rows = [];
        for (let r = 0; r < 9; r++) {
            const row: number[] = [];
            for (let c = 0; c < 9; c++) row.push(r * 9 + c);
            this.rows.push(row);
        }

        this.cols = [];
        for (let c = 0; c < 9; c++) {
            const col: number[] = [];
            for (let r = 0; r < 9; r++) col.push(r * 9 + c);
            this.cols.push(col);
        }

        this.boxes = [];
        for (let r = 0; r < 9; r += 3) {
            for (let c = 0; c < 9; c += 3) {
                const box: number[] = [];
                for (let i = 0; i < 3; i++) {
                    for (let j = 0; j < 3; j++) {
                        box.push((r + i) * 9 + (c + j));
                    }
                }
                this.boxes.push(box);
            }
        }

        this.units = [...this.rows, ...this.cols, ...this.boxes];
        this.peers = Array.from({ length: 81 }, () => new Set());

        for (let i = 0; i < 81; i++) {
            for (const unit of this.units) {
                if (unit.includes(i)) {
                    for (const u of unit) {
                        if (u !== i) this.peers[i].add(u);
                    }
                }
            }
        }

        // Initial candidate pruning
        for (let i = 0; i < 81; i++) {
            if (this.grid[i] !== 0) {
                this.eliminateCandidates(i, this.grid[i]);
            }
        }
    }

    eliminateCandidates(idx: number, val: number) {
        for (const peer of this.peers[idx]) {
            if (this.candidates[peer].has(val)) {
                this.candidates[peer].delete(val);
            }
        }
    }

    setValue(idx: number, val: number) {
        this.grid[idx] = val;
        this.candidates[idx] = new Set();
        this.eliminateCandidates(idx, val);
    }

    // --- Techniques ---

    getNextHint(): HintDetails | null {
        // 1. Naked Single
        const nakedSingle = this.findNakedSingle();
        if (nakedSingle) return nakedSingle;

        // 2. Hidden Single
        const hiddenSingle = this.findHiddenSingle();
        if (hiddenSingle) return hiddenSingle;

        // 3. Locked Candidates (Pointing/Claiming)
        const locked = this.findLockedCandidates();
        if (locked) return locked;

        // 4. Pairs / Triples
        const nakedPairsTriples = this.findNakedPairsTriples();
        if (nakedPairsTriples) return nakedPairsTriples;

        const hiddenPairsTriples = this.findHiddenPairsTriples();
        if (hiddenPairsTriples) return hiddenPairsTriples;

        // 5. Advanced
        const xWing = this.findXWing();
        if (xWing) return xWing;

        const yWing = this.findYWing();
        if (yWing) return yWing;

        return null;
    }

    findNakedSingle(): HintDetails | null {
        for (let i = 0; i < 81; i++) {
            if (this.grid[i] === 0 && this.candidates[i].size === 1) {
                const val = Array.from(this.candidates[i])[0];
                const r = Math.floor(i / 9) + 1;
                const c = (i % 9) + 1;
                return {
                    type: 'Naked Single',
                    difficulty: 1,
                    description: `Row ${r}, Column ${c} has only one possible candidate: ${val}.`,
                    cell: i,
                    val: val,
                    relatedRegions: [
                        { type: 'row', index: r - 1 },
                        { type: 'col', index: c - 1 },
                        { type: 'box', index: Math.floor((r - 1) / 3) * 3 + Math.floor((c - 1) / 3) }
                    ]
                };
            }
        }
        return null;
    }

    findHiddenSingle(): HintDetails | null {
        // Block
        for (let b = 0; b < 9; b++) {
            const boxIndices = this.boxes[b];
            for (let val = 1; val <= 9; val++) {
                const possibleLocs = boxIndices.filter(i => this.grid[i] === 0 && this.candidates[i].has(val));
                if (possibleLocs.length === 1) {
                    const idx = possibleLocs[0];
                    const r = Math.floor(idx / 9) + 1;
                    const c = (idx % 9) + 1;
                    return {
                        type: 'Hidden Single',
                        difficulty: 1,
                        description: `In Box ${b + 1}, the number ${val} can only go in Row ${r}, Column ${c}.`,
                        cell: idx,
                        val: val,
                        relatedRegions: [{ type: 'box', index: b }]
                    };
                }
            }
        }

        // Row
        for (let r = 0; r < 9; r++) {
            const rowIndices = this.rows[r];
            for (let val = 1; val <= 9; val++) {
                const possibleLocs = rowIndices.filter(i => this.grid[i] === 0 && this.candidates[i].has(val));
                if (possibleLocs.length === 1) {
                    const idx = possibleLocs[0];
                    const c = (idx % 9) + 1;
                    return {
                        type: 'Hidden Single',
                        difficulty: 1,
                        description: `In Row ${r + 1}, the number ${val} can only go in Column ${c}.`,
                        cell: idx,
                        val: val,
                        relatedRegions: [{ type: 'row', index: r }]
                    };
                }
            }
        }

        // Col
        for (let c = 0; c < 9; c++) {
            const colIndices = this.cols[c];
            for (let val = 1; val <= 9; val++) {
                const possibleLocs = colIndices.filter(i => this.grid[i] === 0 && this.candidates[i].has(val));
                if (possibleLocs.length === 1) {
                    const idx = possibleLocs[0];
                    const r = Math.floor(idx / 9) + 1;
                    return {
                        type: 'Hidden Single',
                        difficulty: 1,
                        description: `In Column ${c + 1}, the number ${val} can only go in Row ${r}.`,
                        cell: idx,
                        val: val,
                        relatedRegions: [{ type: 'col', index: c }]
                    };
                }
            }
        }
        return null;
    }

    findLockedCandidates(): HintDetails | null {
        // Pointing: Box -> Row/Col
        for (let b = 0; b < 9; b++) {
            const boxIndices = this.boxes[b];
            for (let val = 1; val <= 9; val++) {
                const locs = boxIndices.filter(i => this.grid[i] === 0 && this.candidates[i].has(val));
                if (locs.length === 0) continue;

                // Check Row
                const rows = new Set(locs.map(i => Math.floor(i / 9)));
                if (rows.size === 1) {
                    const r = Array.from(rows)[0];
                    const elim: number[] = [];
                    for (let c = 0; c < 9; c++) {
                        const idx = r * 9 + c;
                        if (!boxIndices.includes(idx) && this.grid[idx] === 0 && this.candidates[idx].has(val)) {
                            elim.push(idx);
                        }
                    }
                    if (elim.length > 0) {
                        return {
                            type: 'Pointing',
                            difficulty: 2,
                            description: `In Box ${b + 1}, the number ${val} is confined to Row ${r + 1}. It can be removed from other cells in that row.`,
                            val: val,
                            eliminations: elim,
                            relatedRegions: [{ type: 'box', index: b }, { type: 'row', index: r }]
                        };
                    }
                }

                // Check Col
                const cols = new Set(locs.map(i => i % 9));
                if (cols.size === 1) {
                    const c = Array.from(cols)[0];
                    const elim: number[] = [];
                    for (let r = 0; r < 9; r++) {
                        const idx = r * 9 + c;
                        if (!boxIndices.includes(idx) && this.grid[idx] === 0 && this.candidates[idx].has(val)) {
                            elim.push(idx);
                        }
                    }
                    if (elim.length > 0) {
                        return {
                            type: 'Pointing',
                            difficulty: 2,
                            description: `In Box ${b + 1}, the number ${val} is confined to Column ${c + 1}. It can be removed from other cells in that column.`,
                            val: val,
                            eliminations: elim,
                            relatedRegions: [{ type: 'box', index: b }, { type: 'col', index: c }]
                        };
                    }
                }
            }
        }

        // Claiming: Row/Col -> Box
        // Row -> Box
        for (let r = 0; r < 9; r++) {
            const rowIndices = this.rows[r];
            for (let val = 1; val <= 9; val++) {
                const locs = rowIndices.filter(i => this.grid[i] === 0 && this.candidates[i].has(val));
                if (locs.length === 0) continue;

                const boxes = new Set(locs.map(i => Math.floor(i / 9 / 3) * 3 + Math.floor((i % 9) / 3)));
                if (boxes.size === 1) {
                    const b = Array.from(boxes)[0];
                    const boxIndices = this.boxes[b];
                    const elim: number[] = [];
                    for (const idx of boxIndices) {
                        if (!rowIndices.includes(idx) && this.grid[idx] === 0 && this.candidates[idx].has(val)) {
                            elim.push(idx);
                        }
                    }
                    if (elim.length > 0) {
                        return {
                            type: 'Claiming',
                            difficulty: 2,
                            description: `In Row ${r + 1}, the number ${val} is confined to Box ${b + 1}. It can be removed from other cells in that box.`,
                            val: val,
                            eliminations: elim,
                            relatedRegions: [{ type: 'row', index: r }, { type: 'box', index: b }]
                        };
                    }
                }
            }
        }

        // Col -> Box
        for (let c = 0; c < 9; c++) {
            const colIndices = this.cols[c];
            for (let val = 1; val <= 9; val++) {
                const locs = colIndices.filter(i => this.grid[i] === 0 && this.candidates[i].has(val));
                if (locs.length === 0) continue;

                const boxes = new Set(locs.map(i => Math.floor(i / 9 / 3) * 3 + Math.floor((i % 9) / 3)));
                if (boxes.size === 1) {
                    const b = Array.from(boxes)[0];
                    const boxIndices = this.boxes[b];
                    const elim: number[] = [];
                    for (const idx of boxIndices) {
                        if (!colIndices.includes(idx) && this.grid[idx] === 0 && this.candidates[idx].has(val)) {
                            elim.push(idx);
                        }
                    }
                    if (elim.length > 0) {
                        return {
                            type: 'Claiming',
                            difficulty: 2,
                            description: `In Column ${c + 1}, the number ${val} is confined to Box ${b + 1}. It can be removed from other cells in that box.`,
                            val: val,
                            eliminations: elim,
                            relatedRegions: [{ type: 'col', index: c }, { type: 'box', index: b }]
                        };
                    }
                }
            }
        }

        return null;
    }

    findNakedPairsTriples(): HintDetails | null {
        for (const unit of this.units) {
            const candidatesCells: Record<string, number[]> = {};

            for (const idx of unit) {
                if (this.grid[idx] === 0) {
                    const cands = Array.from(this.candidates[idx]).sort((a, b) => a - b);
                    if (cands.length >= 2 && cands.length <= 3) {
                        const key = cands.join(',');
                        if (!candidatesCells[key]) candidatesCells[key] = [];
                        candidatesCells[key].push(idx);
                    }
                }
            }

            for (const [key, cells] of Object.entries(candidatesCells)) {
                const cands = key.split(',').map(Number);
                if (cells.length === cands.length) {
                    // Found Pair/Triple
                    const elim: number[] = [];
                    for (const idx of unit) {
                        if (!cells.includes(idx) && this.grid[idx] === 0) {
                            let hasElim = false;
                            for (const c of cands) {
                                if (this.candidates[idx].has(c)) {
                                    hasElim = true;
                                    break;
                                }
                            }
                            if (hasElim) elim.push(idx);
                        }
                    }

                    if (elim.length > 0) {
                        const type = cands.length === 2 ? 'Naked Pair' : 'Naked Triple';
                        return {
                            type,
                            difficulty: 2,
                            description: `Cells ${cells.map(i => `R${Math.floor(i / 9) + 1}C${i % 9 + 1}`).join(', ')} contain only candidates {${cands.join(', ')}}. These candidates can be removed from other cells in the same unit.`,
                            cells: cells,
                            candidates: cands,
                            eliminations: elim,
                            relatedCells: cells
                        };
                    }
                }
            }
        }
        return null;
    }

    findHiddenPairsTriples(): HintDetails | null {
        for (const unit of this.units) {
            const counts: Record<number, number[]> = {};
            for (const idx of unit) {
                if (this.grid[idx] === 0) {
                    for (const val of this.candidates[idx]) {
                        if (!counts[val]) counts[val] = [];
                        counts[val].push(idx);
                    }
                }
            }

            const possibleCands = Object.entries(counts)
                .filter(([_, cells]) => cells.length >= 2 && cells.length <= 3)
                .map(([val, cells]) => ({ val: Number(val), cells }));

            // Group by cell set
            const cellsToCands: Record<string, number[]> = {};
            for (const { val, cells } of possibleCands) {
                const key = cells.sort((a, b) => a - b).join(',');
                if (!cellsToCands[key]) cellsToCands[key] = [];
                cellsToCands[key].push(val);
            }

            for (const [key, cands] of Object.entries(cellsToCands)) {
                const cells = key.split(',').map(Number);
                if (cands.length === cells.length) {
                    // Found Hidden Pair/Triple
                    const elim: number[] = [];
                    for (const idx of cells) {
                        const currentCands = this.candidates[idx];
                        // Check if there are other candidates to remove
                        const otherCands = Array.from(currentCands).filter(c => !cands.includes(c));
                        if (otherCands.length > 0) {
                            elim.push(idx);
                        }
                    }

                    if (elim.length > 0) {
                        const type = cands.length === 2 ? 'Hidden Pair' : 'Hidden Triple';
                        return {
                            type,
                            difficulty: 2,
                            description: `Candidates {${cands.join(', ')}} appear only in cells ${cells.map(i => `R${Math.floor(i / 9) + 1}C${i % 9 + 1}`).join(', ')} within this unit. All other candidates can be removed from these cells.`,
                            cells: cells,
                            candidates: cands,
                            eliminations: elim,
                            relatedCells: cells
                        };
                    }
                }
            }
        }
        return null;
    }

    findXWing(): HintDetails | null {
        // Rows
        for (let val = 1; val <= 9; val++) {
            const rowsWith2: { r: number; cols: number[] }[] = [];
            for (let r = 0; r < 9; r++) {
                const cols: number[] = [];
                for (let c = 0; c < 9; c++) {
                    const idx = r * 9 + c;
                    if (this.grid[idx] === 0 && this.candidates[idx].has(val)) {
                        cols.push(c);
                    }
                }
                if (cols.length === 2) {
                    rowsWith2.push({ r, cols });
                }
            }

            for (let i = 0; i < rowsWith2.length; i++) {
                for (let j = i + 1; j < rowsWith2.length; j++) {
                    const r1 = rowsWith2[i];
                    const r2 = rowsWith2[j];
                    if (r1.cols[0] === r2.cols[0] && r1.cols[1] === r2.cols[1]) {
                        // X-Wing found
                        const c1 = r1.cols[0];
                        const c2 = r1.cols[1];
                        const elim: number[] = [];

                        for (let r = 0; r < 9; r++) {
                            if (r !== r1.r && r !== r2.r) {
                                for (const c of [c1, c2]) {
                                    const idx = r * 9 + c;
                                    if (this.grid[idx] === 0 && this.candidates[idx].has(val)) {
                                        elim.push(idx);
                                    }
                                }
                            }
                        }

                        if (elim.length > 0) {
                            return {
                                type: 'X-Wing',
                                difficulty: 3,
                                description: `X-Wing for number ${val} in Rows ${r1.r + 1} and ${r2.r + 1}. Candidates can be removed from Columns ${c1 + 1} and ${c2 + 1}.`,
                                val: val,
                                eliminations: elim,
                                relatedCells: [r1.r * 9 + c1, r1.r * 9 + c2, r2.r * 9 + c1, r2.r * 9 + c2],
                                relatedRegions: [{ type: 'row', index: r1.r }, { type: 'row', index: r2.r }]
                            };
                        }
                    }
                }
            }
        }

        // Cols
        for (let val = 1; val <= 9; val++) {
            const colsWith2: { c: number; rows: number[] }[] = [];
            for (let c = 0; c < 9; c++) {
                const rows: number[] = [];
                for (let r = 0; r < 9; r++) {
                    const idx = r * 9 + c;
                    if (this.grid[idx] === 0 && this.candidates[idx].has(val)) {
                        rows.push(r);
                    }
                }
                if (rows.length === 2) {
                    colsWith2.push({ c, rows });
                }
            }

            for (let i = 0; i < colsWith2.length; i++) {
                for (let j = i + 1; j < colsWith2.length; j++) {
                    const c1 = colsWith2[i];
                    const c2 = colsWith2[j];
                    if (c1.rows[0] === c2.rows[0] && c1.rows[1] === c2.rows[1]) {
                        // X-Wing found
                        const r1 = c1.rows[0];
                        const r2 = c1.rows[1];
                        const elim: number[] = [];

                        for (let c = 0; c < 9; c++) {
                            if (c !== c1.c && c !== c2.c) {
                                for (const r of [r1, r2]) {
                                    const idx = r * 9 + c;
                                    if (this.grid[idx] === 0 && this.candidates[idx].has(val)) {
                                        elim.push(idx);
                                    }
                                }
                            }
                        }

                        if (elim.length > 0) {
                            return {
                                type: 'X-Wing',
                                difficulty: 3,
                                description: `X-Wing for number ${val} in Columns ${c1.c + 1} and ${c2.c + 1}. Candidates can be removed from Rows ${r1 + 1} and ${r2 + 1}.`,
                                val: val,
                                eliminations: elim,
                                relatedCells: [r1 * 9 + c1.c, r1 * 9 + c2.c, r2 * 9 + c1.c, r2 * 9 + c2.c],
                                relatedRegions: [{ type: 'col', index: c1.c }, { type: 'col', index: c2.c }]
                            };
                        }
                    }
                }
            }
        }

        return null;
    }

    findYWing(): HintDetails | null {
        const bivalueCells = [];
        for (let i = 0; i < 81; i++) {
            if (this.grid[i] === 0 && this.candidates[i].size === 2) {
                bivalueCells.push(i);
            }
        }

        for (const pivot of bivalueCells) {
            const cands = Array.from(this.candidates[pivot]);
            const [A, B] = cands;

            const pincersA: number[] = [];
            const pincersB: number[] = [];

            for (const peer of this.peers[pivot]) {
                if (this.grid[peer] === 0 && this.candidates[peer].size === 2) {
                    if (this.candidates[peer].has(A) && !this.candidates[peer].has(B)) {
                        pincersA.push(peer);
                    } else if (this.candidates[peer].has(B) && !this.candidates[peer].has(A)) {
                        pincersB.push(peer);
                    }
                }
            }

            for (const pA of pincersA) {
                for (const pB of pincersB) {
                    const candA = Array.from(this.candidates[pA]).find(c => c !== A);
                    const candB = Array.from(this.candidates[pB]).find(c => c !== B);

                    if (candA && candB && candA === candB) {
                        const C = candA;
                        // Found Y-Wing: Pivot(AB), PincerA(AC), PincerB(BC)
                        // Eliminate C from common peers of pA and pB
                        const commonPeers = new Set<number>();
                        for (const peer of this.peers[pA]) {
                            if (this.peers[pB].has(peer)) {
                                commonPeers.add(peer);
                            }
                        }

                        const elim: number[] = [];
                        for (const peer of commonPeers) {
                            if (this.grid[peer] === 0 && this.candidates[peer].has(C)) {
                                elim.push(peer);
                            }
                        }

                        if (elim.length > 0) {
                            return {
                                type: 'Y-Wing',
                                difficulty: 3,
                                description: `Y-Wing found with pivot at R${Math.floor(pivot / 9) + 1}C${pivot % 9 + 1}. Eliminating candidate ${C} from common peers.`,
                                val: C,
                                eliminations: elim,
                                relatedCells: [pivot, pA, pB]
                            };
                        }
                    }
                }
            }
        }
        return null;
    }
}
