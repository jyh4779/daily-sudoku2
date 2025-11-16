import RNFS from 'react-native-fs';
import AppLogger from '../../../core/logger/AppLogger';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert' | 'unknown';

export type LoadedPuzzle = {
  puzzle: string;        // 81 chars, 0/./숫자
  solution?: string;     // (선택) 81 chars
  difficulty?: Difficulty;
  source: {
    filename: string;    // assets 내 상대 경로
    fileLine: number;    // 원본 파일 기준 1-based 라인 번호
    index: number;       // 유효 퍼즐 배열 내 1-based 인덱스
  };
};

type ParsedLine = {
  puzzle: string;
  solution?: string;
  difficulty?: Difficulty;
  fileLine: number; // 1-based
};

const PUZZLE_ASSET_PATH = 'sudoku/puzzles.txt'; // 필요 시 프로젝트 실제 경로로 조정

const PUZ_RE = /([0-9\.]{81})/g; // 퍼즐/해답 81자(0~9 또는 .) 캡처

function parsePuzzlesWithFileLine(raw: string): ParsedLine[] {
  const lines = raw.split(/\r?\n/);
  const out: ParsedLine[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const original = lines[i];
    const trimmed = original.trim();

    // 주석/공백 라인 skip
    if (!trimmed || trimmed.startsWith('#')) continue;

    // 라인에서 81자 시퀀스를 최대 2개까지 탐색 (퍼즐, 해답)
    const matches = trimmed.match(PUZ_RE);
    if (!matches || matches.length === 0) continue;

    const puzzle = matches[0];
    const solution = matches.length > 1 ? matches[1] : undefined;

    // 난이도 힌트를 라인 텍스트에서 heuristic 추출(선택)
    let difficulty: Difficulty | undefined;
    if (/easy/i.test(trimmed)) difficulty = 'easy';
    else if (/medium/i.test(trimmed)) difficulty = 'medium';
    else if (/hard/i.test(trimmed)) difficulty = 'hard';
    else if (/expert|evil/i.test(trimmed)) difficulty = 'expert';

    out.push({
      puzzle,
      solution,
      difficulty,
      fileLine: i + 1, // 실제 파일 줄 번호(1-based)
    });
  }
  return out;
}

export async function loadRandomPuzzleAndLog(): Promise<LoadedPuzzle> {
  // Android asset에서 직접 읽기
  const raw = await RNFS.readFileAssets(PUZZLE_ASSET_PATH, 'utf8');
  const entries = parsePuzzlesWithFileLine(raw);

  if (entries.length === 0) {
    await AppLogger.error('PUZZLE_LOAD', 'No valid puzzles found', { filename: PUZZLE_ASSET_PATH });
    throw new Error('No valid puzzles found in asset file');
  }

  const idx = Math.floor(Math.random() * entries.length);
  const chosen = entries[idx];

  const loaded: LoadedPuzzle = {
    puzzle: chosen.puzzle,
    solution: chosen.solution,
    difficulty: chosen.difficulty ?? 'unknown',
    source: {
      filename: PUZZLE_ASSET_PATH,
      fileLine: chosen.fileLine,
      index: idx + 1, // 유효 퍼즐 배열 내 순번(1-based)
    },
  };

  await AppLogger.info('PUZZLE_LOAD', 'Puzzle loaded', {
    filename: loaded.source.filename,
    fileLine: loaded.source.fileLine, // ✅ 요청하신 "몇 번째 줄"이 여기 남습니다
    index: loaded.source.index,
    difficulty: loaded.difficulty,
  });

  return loaded;
}