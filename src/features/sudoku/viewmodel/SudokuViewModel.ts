import { create } from 'zustand';
import AppLogger from '../../../../src/core/logger/AppLogger';
import { loadRandomPuzzleAndLog, LoadedPuzzle } from '../model/SudokuRepository';

type SudokuState = {
  grid: string;                  // 현재 퍼즐 원본(81)
  solution?: string;
  difficulty?: string;
  sourceLine?: number;           // 원본 파일 '몇 번째 줄'
  sourceFile?: string;
  isLoading: boolean;
  error?: string;

  loadNewGame: () => Promise<void>;
};

export const useSudokuVM = create<SudokuState>((set, get) => ({
  grid: '',
  solution: undefined,
  difficulty: undefined,
  sourceLine: undefined,
  sourceFile: undefined,
  isLoading: false,
  error: undefined,

  loadNewGame: async () => {
    set({ isLoading: true, error: undefined });
    try {
      const loaded: LoadedPuzzle = await loadRandomPuzzleAndLog();
      set({
        grid: loaded.puzzle,
        solution: loaded.solution,
        difficulty: loaded.difficulty,
        sourceLine: loaded.source.fileLine,
        sourceFile: loaded.source.filename,
        isLoading: false,
      });
      // ViewModel 차원의 보조 로그(선택)
      await AppLogger.info('VM', 'State updated with loaded puzzle', {
        fileLine: loaded.source.fileLine,
        filename: loaded.source.filename,
      });
    } catch (e: any) {
      set({ isLoading: false, error: e?.message ?? 'Failed to load puzzle' });
      await AppLogger.error('VM', 'Failed to load puzzle', { message: String(e) });
    }
  },
}));