import { readAssetText } from '../../../utils/readAssetText';
import AppLogger from '../../../core/logger/AppLogger';
import { parseGridsAuto, Grid } from '../../../utils/sudokuParser';

export type Pair = {
  puzzle: Grid;
  solution: Grid;
  __meta?: { puzzleStartLine: number; solutionStartLine: number; label?: string };
};

export async function loadPairsFromAssets(
  puzzleModuleId: number,
  solutionModuleId: number,
  label?: string
): Promise<Pair[]> {
  const [pTxt, sTxt] = await Promise.all([
    readAssetText(puzzleModuleId),
    readAssetText(solutionModuleId),
  ]);

  const puzzles = parseGridsAuto(pTxt);
  const solutions = parseGridsAuto(sTxt);

  const n = Math.min(puzzles.length, solutions.length);
  const pairs: Pair[] = Array.from({ length: n }, (_, i) => ({
    puzzle: puzzles[i].grid,
    solution: solutions[i].grid,
    __meta: {
      puzzleStartLine: puzzles[i].startLine,
      solutionStartLine: solutions[i].startLine,
      label,
    },
  }));

  return pairs;
}

export function pickRandomPair(pairs: Pair[]): Pair {
  if (!pairs.length) throw new Error('Empty pairs');
  const idx = Math.floor(Math.random() * pairs.length);
  const chosen = pairs[idx];
  void AppLogger.info('PUZZLE_LOAD', 'Puzzle picked', {
    filename: chosen.__meta?.label ?? 'puzzles',
    fileLine: chosen.__meta?.puzzleStartLine ?? -1,
    index: idx + 1,
  });
  return chosen;
}
