import { getDb } from '../../../core/db/sqlite';
import type { Difficulty } from './PuzzleRepositorySqlite';

const TABLE = 'saved_game';

const emptyGrid = () => Array.from({ length: 9 }, () => Array(9).fill(0));
const parseGrid = (payload: string | null | undefined) => {
  try {
    const parsed = JSON.parse(payload ?? '[]');
    if (Array.isArray(parsed) && parsed.length === 9) {
      return parsed.map(row => (Array.isArray(row) && row.length === 9 ? row.map(n => Number(n) || 0) : Array(9).fill(0)));
    }
  } catch {
    // ignore
  }
  return emptyGrid();
};

const parseJSON = <T>(payload: string | null | undefined, fallback: T): T => {
  try {
    const parsed = JSON.parse(payload ?? '');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

type SavedGameRow = {
  puzzle_json: string;
  solution_json: string;
  values_json: string;
  notes_json: string;
  undo_stack_json: string;
  mistakes: number;
  mistake_limit: number;
  difficulty: Difficulty;
  elapsed_sec: number;
  note_mode: number;
  pad_select_mode: number;
  selected_pad: number | null;
  saved_at: number;
};

export type SavedGameSnapshot = {
  puzzle: number[][];
  solution: number[][];
  values: number[][];
  notes: number[][];
  undoStack: any[];
  mistakes: number;
  mistakeLimit: number;
  difficulty: Difficulty;
  elapsedSec: number;
  noteMode: boolean;
  padSelectMode: boolean;
  selectedPad: number | null;
  savedAt?: number;
};

const ensureTable = async () => {
  const db = await getDb();
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      id INTEGER PRIMARY KEY NOT NULL,
      puzzle_json TEXT NOT NULL,
      solution_json TEXT NOT NULL,
      values_json TEXT NOT NULL,
      notes_json TEXT NOT NULL,
      undo_stack_json TEXT,
      mistakes INTEGER NOT NULL,
      mistake_limit INTEGER NOT NULL,
      difficulty TEXT NOT NULL,
      elapsed_sec INTEGER NOT NULL,
      note_mode INTEGER NOT NULL,
      pad_select_mode INTEGER NOT NULL,
      selected_pad INTEGER,
      saved_at INTEGER NOT NULL
    )
  `);
  return db;
};

export async function saveSavedGameSnapshot(snapshot: SavedGameSnapshot) {
  const db = await ensureTable();
  await db.executeSql(
    `
      INSERT OR REPLACE INTO ${TABLE} (
        id, puzzle_json, solution_json, values_json, notes_json, undo_stack_json,
        mistakes, mistake_limit, difficulty, elapsed_sec, note_mode, pad_select_mode, selected_pad, saved_at
      ) VALUES (
        1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(strftime('%s','now') AS INTEGER)
      )
    `,
    [
      JSON.stringify(snapshot.puzzle),
      JSON.stringify(snapshot.solution),
      JSON.stringify(snapshot.values),
      JSON.stringify(snapshot.notes),
      JSON.stringify(snapshot.undoStack ?? []),
      snapshot.mistakes,
      snapshot.mistakeLimit,
      snapshot.difficulty,
      snapshot.elapsedSec,
      snapshot.noteMode ? 1 : 0,
      snapshot.padSelectMode ? 1 : 0,
      snapshot.selectedPad ?? null,
    ]
  );
}

export async function loadSavedGameSnapshot(): Promise<SavedGameSnapshot | null> {
  const db = await ensureTable();
  const [res] = await db.executeSql(`SELECT * FROM ${TABLE} WHERE id = 1 LIMIT 1`);
  if (!res.rows.length) return null;
  const row = res.rows.item(0) as SavedGameRow;
  return {
    puzzle: parseGrid(row.puzzle_json),
    solution: parseGrid(row.solution_json),
    values: parseGrid(row.values_json),
    notes: parseGrid(row.notes_json),
    undoStack: parseJSON(row.undo_stack_json, []),
    mistakes: Number(row.mistakes) || 0,
    mistakeLimit: Number(row.mistake_limit) || 3,
    difficulty: (row.difficulty as Difficulty) ?? 'easy',
    elapsedSec: Number(row.elapsed_sec) || 0,
    noteMode: !!row.note_mode,
    padSelectMode: !!row.pad_select_mode,
    selectedPad: row.selected_pad === null ? null : Number(row.selected_pad),
    savedAt: row.saved_at,
  };
}

export async function hasSavedGameSnapshot(): Promise<boolean> {
  const db = await ensureTable();
  const [res] = await db.executeSql(`SELECT COUNT(*) AS cnt FROM ${TABLE} WHERE id = 1`);
  return (res.rows.item(0)?.cnt ?? 0) > 0;
}

export async function clearSavedGameSnapshot() {
  const db = await ensureTable();
  await db.executeSql(`DELETE FROM ${TABLE} WHERE id = 1`);
}
