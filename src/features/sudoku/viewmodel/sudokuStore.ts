import { create } from 'zustand';
import { getRandomFromTable, Pair } from '../data/PuzzleRepositorySqlite';
import { fetchRandomPuzzleByDifficulty } from '../data/PuzzleRepositoryFirestore';
import { log, warn } from '../../../core/logger/log';
import { appendFileLog } from '../../../core/logger/fileLogger';
import { clearSavedGameSnapshot, loadSavedGameSnapshot, saveSavedGameSnapshot } from '../data/SavedGameRepository';

const N = 9;
const empty9 = () => Array.from({ length: N }, () => Array(N).fill(0));
const to9x9 = (g?: number[][]) =>
  Array.isArray(g) && g.length === N && g.every(r => Array.isArray(r) && r.length === N)
    ? g.map(row => row.map(val => Number(val) || 0))
    : empty9();
const clone9 = (g: number[][]) => g.map(r => r.slice());

type RC = { r: number; c: number };

type NotePatch = { r: number; c: number; prevNotes: number; nextNotes: number };
type UndoItem = { r: number; c: number; prev: number; next: number; prevNotes: number; nextNotes: number; peerNotePatches?: NotePatch[] };

type SudokuState = {
  values: number[][];
  puzzle: number[][];
  solution: number[][];
  grid: number[][];
  notes: number[][]; // bitmask per cell (1<<1..1<<9)
  selected: RC | null;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  mistakes: number;
  mistakeLimit: number;
  undoStack: UndoItem[]; // max depth 3
  elapsedSec: number;
  hasLoadedGame: boolean;

  setSelected: (rc: RC | null) => void;
  setValue: (r: number, c: number, v: number) => void;
  loadRandomEasy: () => Promise<void>;
  loadSavedGameFromDb: () => Promise<boolean>;
  clearSavedProgress: () => Promise<void>;

  inputNumber: (n: number) => void;
  toggleNoteAtSelected: (n: number) => void;
  clearNotesAt: (r: number, c: number) => void;
  eraseSelected: () => void;
  undo: () => void;
  // game control
  resetMistakes: () => void;
  restartCurrent: () => void;
  resetElapsed: () => void;
  incrementElapsed: () => void;

  noteMode?: boolean;
  toggleNoteMode?: () => void;

  // Pad-select input mode: tap a number, then tap a cell to input/note it
  padSelectMode?: boolean;
  togglePadSelectMode?: () => void;
  selectedPad?: number | null;
  setSelectedPad?: (n: number | null) => void;

  // Tutorial state
  tutorialHighlights: RC[] | null;
  setTutorialHighlights: (highlights: RC[] | null) => void;
  loadTutorialPuzzle: (puzzle: number[][], solution: number[][]) => void;
};

export const useSudokuStore = create<SudokuState>((set, get) => ({
  values: empty9(),
  puzzle: empty9(),
  solution: empty9(),
  grid: empty9(),
  notes: empty9(),
  selected: null,
  difficulty: 'easy',
  mistakes: 0,
  mistakeLimit: 3,
  undoStack: [],
  elapsedSec: 0,
  hasLoadedGame: false,
  noteMode: false,
  toggleNoteMode: () => set(s => ({ noteMode: !s.noteMode })),
  padSelectMode: false,
  togglePadSelectMode: () => set(s => ({ padSelectMode: !s.padSelectMode, selectedPad: !s.padSelectMode ? null : s.selectedPad })),
  selectedPad: null,
  setSelectedPad: (n) => set({ selectedPad: n }),

  tutorialHighlights: null,
  setTutorialHighlights: (highlights) => set({ tutorialHighlights: highlights }),
  loadTutorialPuzzle: (puzzle, solution) => {
    const vals = clone9(puzzle);
    set({
      puzzle,
      solution,
      values: vals,
      grid: vals,
      notes: empty9(),
      selected: null,
      difficulty: 'easy',
      mistakes: 0,
      undoStack: [],
      elapsedSec: 0,
      hasLoadedGame: false,
      noteMode: false,
      padSelectMode: false,
      selectedPad: null,
      tutorialHighlights: null,
    });
  },

  setSelected: (rc) => set({ selected: rc }),

  setValue: (r, c, v) =>
    set(state => {
      const next = state.values.map(row => row.slice());
      next[r][c] = v;
      return { values: next, grid: next };
    }),

  inputNumber: (n) => {
    const { selected, puzzle, solution, values } = get();
    if (!selected) return;
    const { r, c } = selected;
    if (puzzle[r][c] !== 0) return; // cannot change givens
    const prev = values[r][c] || 0;
    if (prev === n) return;
    const isCorrect = solution?.[r]?.[c] === n;
    set(state => {
      const next = state.values.map(row => row.slice());
      next[r][c] = n;
      const notes = state.notes.map(row => row.slice());
      const prevNotes = notes[r][c] | 0;
      // entering value clears notes in the cell
      notes[r][c] = 0;
      // remove same-digit notes in row, column, and 3x3 box from empty editable cells
      const bit = 1 << n;
      const patches: NotePatch[] = [];
      // row
      for (let cc = 0; cc < 9; cc++) {
        if (cc === c) continue;
        if (puzzle[r][cc] === 0 && next[r][cc] === 0) {
          const before = notes[r][cc] | 0;
          const after = before & ~bit;
          if (after !== before) {
            notes[r][cc] = after;
            patches.push({ r, c: cc, prevNotes: before, nextNotes: after });
          }
        }
      }
      // column
      for (let rr = 0; rr < 9; rr++) {
        if (rr === r) continue;
        if (puzzle[rr][c] === 0 && next[rr][c] === 0) {
          const before = notes[rr][c] | 0;
          const after = before & ~bit;
          if (after !== before) {
            notes[rr][c] = after;
            patches.push({ r: rr, c, prevNotes: before, nextNotes: after });
          }
        }
      }
      // box
      const br = Math.floor(r / 3) * 3;
      const bc = Math.floor(c / 3) * 3;
      for (let rr = br; rr < br + 3; rr++) {
        for (let cc = bc; cc < bc + 3; cc++) {
          if (rr === r && cc === c) continue;
          if (puzzle[rr][cc] === 0 && next[rr][cc] === 0) {
            const before = notes[rr][cc] | 0;
            const after = before & ~bit;
            if (after !== before) {
              notes[rr][cc] = after;
              patches.push({ r: rr, c: cc, prevNotes: before, nextNotes: after });
            }
          }
        }
      }
      const stack = state.undoStack.slice();
      stack.push({ r, c, prev, next: n, prevNotes, nextNotes: 0, peerNotePatches: patches });
      if (stack.length > 3) stack.shift();
      return {
        values: next,
        grid: next,
        notes,
        mistakes: state.mistakes + (isCorrect ? 0 : 1),
        undoStack: stack,
        selected: null, // defocus after input
      };
    });
  },

  toggleNoteAtSelected: (n) => {
    const { selected, puzzle } = get();
    if (!selected) return;
    const { r, c } = selected;
    if (puzzle[r][c] !== 0) return;
    const bit = 1 << n;
    set(state => {
      const notes = state.notes.map(row => row.slice());
      const cur = notes[r][c] | 0;
      notes[r][c] = (cur & bit) ? (cur & ~bit) : (cur | bit);
      return { notes };
    });
  },

  clearNotesAt: (r, c) => set(state => {
    const notes = state.notes.map(row => row.slice());
    notes[r][c] = 0;
    return { notes };
  }),

  eraseSelected: () => {
    const { selected, puzzle, values } = get();
    if (!selected) return;
    const { r, c } = selected;
    if (puzzle[r][c] !== 0) return; // cannot erase givens
    const prev = values[r][c] || 0;
    if (prev === 0) return; // nothing to erase
    set(state => {
      const next = state.values.map(row => row.slice());
      next[r][c] = 0;
      const curNotes = (state.notes?.[r]?.[c] ?? 0) | 0;
      const stack = state.undoStack.slice();
      stack.push({ r, c, prev, next: 0, prevNotes: curNotes, nextNotes: curNotes });
      if (stack.length > 3) stack.shift();
      return { values: next, grid: next, undoStack: stack };
    });
  },

  undo: () => {
    const { undoStack } = get();
    if (!undoStack.length) return;
    const last = undoStack[undoStack.length - 1];
    set(state => {
      const next = state.values.map(row => row.slice());
      next[last.r][last.c] = last.prev;
      const notes = state.notes.map(row => row.slice());
      notes[last.r][last.c] = last.prevNotes | 0;
      if (last.peerNotePatches && last.peerNotePatches.length) {
        for (const p of last.peerNotePatches) {
          if (p.r >= 0 && p.r < 9 && p.c >= 0 && p.c < 9) {
            notes[p.r][p.c] = p.prevNotes | 0;
          }
        }
      }
      const stack = state.undoStack.slice(0, -1);
      return { values: next, grid: next, notes, undoStack: stack };
    });
  },

  // Reset only the mistakes counter
  resetMistakes: () => set({ mistakes: 0 }),

  // Restart current puzzle from the beginning
  restartCurrent: () =>
    set(state => {
      const vals = clone9(state.puzzle);
      return {
        values: vals,
        grid: vals,
        notes: empty9(),
        selected: null,
        mistakes: 0,
        undoStack: [],
        elapsedSec: 0,
        noteMode: false,
        padSelectMode: false,
        selectedPad: null,
      };
    }),

  loadRandomEasy: async () => {
    const applyPair = (pair: Pair) => {
      const puz = to9x9(pair.puzzle);
      const sol = to9x9(pair.solution);
      const vals = clone9(puz);
      set({
        puzzle: puz,
        solution: sol,
        values: vals,
        grid: vals,
        notes: empty9(),
        selected: null,
        difficulty: 'easy',
        mistakes: 0,
        undoStack: [],
        elapsedSec: 0,
        hasLoadedGame: true,
        noteMode: false,
        padSelectMode: false,
        selectedPad: null,
      });
    };

    await log('PUZZLE', 'load start', { from: 'firestore', difficulty: 'easy' });
    await appendFileLog('loadRandomEasy start');
    let lastError: Error | null = null;
    try {
      const pair = await fetchRandomPuzzleByDifficulty('easy');
      applyPair(pair);
      await log('PUZZLE', 'load success (firestore)', { id: pair.meta.id });
      await appendFileLog('loadRandomEasy success firestore', { id: pair.meta.id });
      return;
    } catch (e: any) {
      lastError = e instanceof Error ? e : new Error(String(e));
      await warn('PUZZLE', 'firestore load failed', { error: String(lastError?.message ?? lastError) });
      await appendFileLog('loadRandomEasy firestore failed', { error: String(lastError?.message ?? lastError) });
    }

    try {
      await log('PUZZLE', 'fallback to sqlite', { difficulty: 'easy' });
      const pair = await getRandomFromTable('easy');
      applyPair(pair);
      await log('PUZZLE', 'load success (sqlite)', { id: pair.meta.id, line: pair.meta.line });
      await appendFileLog('loadRandomEasy success sqlite', { id: pair.meta.id, line: pair.meta.line });
    } catch (e: any) {
      const z = empty9();
      set({
        puzzle: z,
        solution: z,
        values: z,
        grid: z,
        notes: empty9(),
        selected: null,
        undoStack: [],
        elapsedSec: 0,
        hasLoadedGame: false,
        noteMode: false,
        padSelectMode: false,
        selectedPad: null,
      });
      await warn('PUZZLE', 'load failed', {
        error: String(e?.message ?? e),
        previousError: lastError ? String(lastError.message) : undefined,
      });
      await appendFileLog('loadRandomEasy failed', {
        error: String(e?.message ?? e),
        previousError: lastError ? String(lastError.message) : undefined,
      });
    }
  },

  loadSavedGameFromDb: async () => {
    try {
      const snapshot = await loadSavedGameSnapshot();
      if (!snapshot) return false;
      const values = to9x9(snapshot.values as number[][]);
      set({
        puzzle: to9x9(snapshot.puzzle as number[][]),
        solution: to9x9(snapshot.solution as number[][]),
        values,
        grid: values,
        notes: to9x9(snapshot.notes as number[][]),
        selected: null,
        difficulty: snapshot.difficulty ?? 'easy',
        mistakes: snapshot.mistakes ?? 0,
        mistakeLimit: snapshot.mistakeLimit ?? 3,
        undoStack: Array.isArray(snapshot.undoStack) ? snapshot.undoStack : [],
        elapsedSec: snapshot.elapsedSec ?? 0,
        noteMode: snapshot.noteMode ?? false,
        padSelectMode: snapshot.padSelectMode ?? false,
        selectedPad: snapshot.selectedPad ?? null,
        hasLoadedGame: true,
      });
      return true;
    } catch (e) {
      await warn('PUZZLE', 'load saved failed', { error: String((e as Error).message) });
      return false;
    }
  },

  clearSavedProgress: async () => {
    try {
      await clearSavedGameSnapshot();
    } catch (e) {
      await warn('PUZZLE', 'clear saved failed', { error: String((e as Error).message) });
    }
  },

  resetElapsed: () => set({ elapsedSec: 0 }),
  incrementElapsed: () => set(state => ({ elapsedSec: state.elapsedSec + 1 })),
}));

const toSnapshot = (state: SudokuState) => ({
  puzzle: state.puzzle,
  solution: state.solution,
  values: state.values,
  notes: state.notes,
  undoStack: state.undoStack,
  mistakes: state.mistakes,
  mistakeLimit: state.mistakeLimit,
  difficulty: state.difficulty,
  elapsedSec: state.elapsedSec,
  noteMode: !!state.noteMode,
  padSelectMode: !!state.padSelectMode,
  selectedPad: state.selectedPad ?? null,
});

let hasSetupPersistence = false;
if (!hasSetupPersistence) {
  hasSetupPersistence = true;
  useSudokuStore.subscribe(state => {
    if (!state.hasLoadedGame) return;
    void saveSavedGameSnapshot(toSnapshot(state)).catch(err => {
      console.warn('Failed to save sudoku progress', err);
    });
  });
}
