import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Difficulty } from './PuzzleRepositorySqlite';

const STORAGE_KEY_NORMAL = '@dailysudoku/savedGame';
const STORAGE_KEY_DAILY = '@dailysudoku/savedGame_daily';

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
  hintsUsed: number;
  savedAt?: number;
  isDailyChallenge?: boolean;
  dailyDate?: string;
};

const getStorageKey = (type: 'normal' | 'daily', dateString?: string) => {
  if (type === 'daily' && dateString) {
    return `${STORAGE_KEY_DAILY}_${dateString}`;
  }
  return type === 'daily' ? STORAGE_KEY_DAILY : STORAGE_KEY_NORMAL;
};

export async function saveSavedGameSnapshot(snapshot: SavedGameSnapshot, type: 'normal' | 'daily' = 'normal', dateString?: string) {
  const key = getStorageKey(type, dateString);
  const payload = JSON.stringify({
    puzzle_json: JSON.stringify(snapshot.puzzle ?? emptyGrid()),
    solution_json: JSON.stringify(snapshot.solution ?? emptyGrid()),
    values_json: JSON.stringify(snapshot.values ?? emptyGrid()),
    notes_json: JSON.stringify(snapshot.notes ?? emptyGrid()),
    undo_stack_json: JSON.stringify(snapshot.undoStack ?? []),
    mistakes: snapshot.mistakes ?? 0,
    mistake_limit: snapshot.mistakeLimit ?? 3,
    difficulty: snapshot.difficulty ?? 'easy',
    elapsed_sec: snapshot.elapsedSec ?? 0,
    note_mode: snapshot.noteMode ? 1 : 0,
    pad_select_mode: snapshot.padSelectMode ? 1 : 0,
    selected_pad: snapshot.selectedPad ?? null,
    hints_used: snapshot.hintsUsed ?? 0,
    saved_at: Date.now(),
    is_daily_challenge: type === 'daily',
    daily_date: snapshot.dailyDate,
  });
  await AsyncStorage.setItem(key, payload);
}

export async function loadSavedGameSnapshot(type: 'normal' | 'daily' = 'normal', dateString?: string): Promise<SavedGameSnapshot | null> {
  const key = getStorageKey(type, dateString);
  const stored = await AsyncStorage.getItem(key);
  if (!stored) return null;
  const row = JSON.parse(stored) as {
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
    hints_used: number;
    saved_at: number;
    is_daily_challenge?: boolean;
    daily_date?: string;
  };
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
    selectedPad: row.selected_pad ?? null,
    hintsUsed: Number(row.hints_used) || 0,
    savedAt: row.saved_at,
    isDailyChallenge: !!row.is_daily_challenge,
    dailyDate: row.daily_date,
  };
}

export async function hasSavedGameSnapshot(type: 'normal' | 'daily' = 'normal', dateString?: string): Promise<boolean> {
  const key = getStorageKey(type, dateString);
  const stored = await AsyncStorage.getItem(key);
  return stored !== null;
}

export async function clearSavedGameSnapshot(type: 'normal' | 'daily' = 'normal', dateString?: string) {
  const key = getStorageKey(type, dateString);
  await AsyncStorage.removeItem(key);
}
