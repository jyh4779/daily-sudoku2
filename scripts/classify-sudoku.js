#!/usr/bin/env node
/**
 * Sudoku difficulty classifier that produces JSON output for Firestore-style ingestion.
 *
 * Usage:
 *   node scripts/classify-sudoku.js [puzzleFile] [--solutions=path] [--limit=10] [--output=path] [--env=path] [--verbose]
 *
 * If --env is omitted, sudoku.env in the project root is used to locate the puzzle/solution files.
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const args = process.argv.slice(2);
const positionalArgs = args.filter((arg) => !arg.startsWith('--'));
const optionValue = (prefix) => {
  const raw = args.find((arg) => arg.startsWith(prefix));
  return raw ? raw.split('=').slice(1).join('=') : undefined;
};

const limit = (() => {
  const raw = optionValue('--limit=');
  return raw ? parseInt(raw, 10) : undefined;
})();
const verbose = args.includes('--verbose');
const envArg = optionValue('--env=');
const solutionOverride = optionValue('--solutions=');
const outputOverride = optionValue('--output=');

const resolvePath = (maybeRelative) =>
  !maybeRelative
    ? undefined
    : path.isAbsolute(maybeRelative)
    ? maybeRelative
    : path.resolve(process.cwd(), maybeRelative);

const defaultEnvPath = path.join(__dirname, '..', 'sudoku.env');
const envPath = resolvePath(envArg) || defaultEnvPath;

const parseEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const entries = {};
  const content = fs.readFileSync(filePath, 'utf-8');
  content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .forEach((line) => {
      if (!line || line.startsWith('#')) return;
      const idx = line.indexOf('=');
      if (idx === -1) return;
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      entries[key] = value;
    });
  return entries;
};

const envConfig = parseEnvFile(envPath);

const puzzleFile =
  positionalArgs[0] ||
  envConfig.PUZZLE_FILE ||
  path.join(__dirname, '..', 'data', 'Easy.sudoku');
const solutionFile =
  solutionOverride ||
  envConfig.SOLUTION_FILE ||
  path.join(__dirname, '..', 'data', 'Easy_output.sudoku');
const outputFile =
  outputOverride ||
  envConfig.OUTPUT_FILE ||
  path.join(__dirname, '..', 'data', 'classified-puzzles.json');

const puzzlePath = resolvePath(puzzleFile);
const solutionPath = resolvePath(solutionFile);
const outputPath = resolvePath(outputFile);

if (!puzzlePath || !fs.existsSync(puzzlePath)) {
  console.error(`❌ Puzzle file not found: ${puzzlePath || puzzleFile}`);
  process.exit(1);
}

if (!solutionPath || !fs.existsSync(solutionPath)) {
  console.error(`❌ Solution file not found: ${solutionPath || solutionFile}`);
  process.exit(1);
}

const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard', 'hell'];

const classifyByClues = (clueCount) => {
  if (clueCount >= 36) return 0;
  if (clueCount >= 33) return 0.5;
  if (clueCount >= 30) return 1;
  if (clueCount >= 28) return 1.6;
  if (clueCount >= 26) return 2.4;
  return 3;
};

const stdDev = (values) => {
  if (!values.length) return 0;
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance =
    values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
    values.length;
  return Math.sqrt(variance);
};

const computeBoardMetrics = (digits) => {
  const rowCounts = Array(9).fill(0);
  const colCounts = Array(9).fill(0);
  const boxCounts = Array(9).fill(0);
  const rowZeroRuns = Array(9).fill(0);
  const colZeroRuns = Array(9).fill(0);

  for (let row = 0; row < 9; row++) {
    let currentRun = 0;
    for (let col = 0; col < 9; col++) {
      const idx = row * 9 + col;
      const value = digits[idx];
      if (value > 0) {
        rowCounts[row] += 1;
        colCounts[col] += 1;
        const boxIndex = Math.floor(row / 3) * 3 + Math.floor(col / 3);
        boxCounts[boxIndex] += 1;
      }

      if (value === 0) {
        currentRun += 1;
        rowZeroRuns[row] = Math.max(rowZeroRuns[row], currentRun);
      } else {
        currentRun = 0;
      }
    }
  }

  for (let col = 0; col < 9; col++) {
    let currentRun = 0;
    for (let row = 0; row < 9; row++) {
      const idx = row * 9 + col;
      const value = digits[idx];

      if (value === 0) {
        currentRun += 1;
        colZeroRuns[col] = Math.max(colZeroRuns[col], currentRun);
      } else {
        currentRun = 0;
      }
    }
  }

  const longestZeroRow = Math.max(...rowZeroRuns);
  const longestZeroColumn = Math.max(...colZeroRuns);

  const centralRowClues = rowCounts.slice(3, 6).reduce((sum, val) => sum + val, 0);
  const centralColClues = colCounts.slice(3, 6).reduce((sum, val) => sum + val, 0);

  return {
    rowCounts,
    colCounts,
    boxCounts,
    longestZeroRow,
    longestZeroColumn,
    minRowClues: Math.min(...rowCounts),
    minColClues: Math.min(...colCounts),
    minBoxClues: Math.min(...boxCounts),
    rowStdDev: stdDev(rowCounts),
    colStdDev: stdDev(colCounts),
    boxStdDev: stdDev(boxCounts),
    centralRowClues,
    centralColClues,
  };
};

const clampDifficultyIndex = (idx) =>
  Math.min(DIFFICULTY_LEVELS.length - 1, Math.max(0, idx));

const classifyPuzzle = (normalized) => {
  const digits = normalized.split('').map((ch) => Number(ch));
  const zeros = digits.filter((n) => n === 0).length;
  const clues = 81 - zeros;
  const metrics = computeBoardMetrics(digits);
  let score = classifyByClues(clues);

  const bump = (delta) => {
    score += delta;
  };

  const maxZeroRun = Math.max(
    metrics.longestZeroRow,
    metrics.longestZeroColumn
  );

  if (maxZeroRun >= 8) {
    bump(clues >= 30 ? 0.35 : 0.45);
  } else if (maxZeroRun >= 6) {
    bump(clues >= 30 ? 0.2 : 0.2);
  }

  if (metrics.minRowClues === 0) {
    bump(0.25);
  }
  if (metrics.minColClues === 0) {
    bump(0.25);
  }
  if (metrics.minRowClues === 0 && metrics.minColClues === 0) {
    bump(0.5);
  }

  if (metrics.minBoxClues < 3) {
    bump(metrics.minBoxClues <= 1 ? 0.3 : 0.05);
    if (clues <= 26 && metrics.minBoxClues <= 1) {
      bump(0.3);
    }
  }
  if (metrics.minBoxClues === 0 && clues >= 28) {
    bump(-0.6);
  }

  const lowerCentral = Math.min(
    metrics.centralRowClues,
    metrics.centralColClues
  );
  if (lowerCentral <= 5) {
    bump(0.5);
  } else if (lowerCentral <= 7) {
    bump(0.2);
  }

  if (
    metrics.minBoxClues >= 3 &&
    maxZeroRun <= 5 &&
    metrics.minRowClues >= 1 &&
    metrics.minColClues >= 1
  ) {
    bump(-0.5);
    if (lowerCentral >= 11 && clues >= 30) {
      bump(-0.3);
    }
  }

  if (
    metrics.minBoxClues >= 2 &&
    maxZeroRun <= 5 &&
    lowerCentral >= 8
  ) {
    bump(-0.4);
  } else if (
    metrics.minBoxClues >= 2 &&
    lowerCentral >= 10
  ) {
    bump(-0.3);
  }

  if (lowerCentral >= 12) {
    bump(-0.3);
  } else if (lowerCentral >= 10) {
    bump(-0.2);
  }

  if (
    metrics.minBoxClues >= 2 &&
    maxZeroRun <= 6 &&
    metrics.centralRowClues >= 9 &&
    metrics.centralColClues >= 9
  ) {
    bump(-0.4);
  }

  if (clues >= 30 && maxZeroRun <= 5) {
    bump(-0.3);
  }

  if (clues >= 30) {
    bump(-0.1);
  }
  if (clues >= 28) {
    bump(-0.05);
  }
  if (clues >= 28 && metrics.minBoxClues >= 2) {
    bump(-0.1);
  }

  if (clues >= 36 && maxZeroRun <= 5 && metrics.minBoxClues >= 3) {
    bump(-0.3);
  }

  score = Math.max(0, Math.min(3, score));
  let index;
  if (score < 0.4) index = 0;
  else if (score < 2.2) index = 1;
  else if (score < 2.85) index = 2;
  else index = 3;

  return {
    clues,
    zeros,
    metrics,
    difficulty: DIFFICULTY_LEVELS[index],
    score,
  };
};

const stats = {
  easy: 0,
  medium: 0,
  hard: 0,
  hell: 0,
};

const solutionLines = fs
  .readFileSync(solutionPath, 'utf-8')
  .split(/\r?\n/);

const results = [];
let processed = 0;
let lineIndex = 0;

const stream = fs.createReadStream(puzzlePath, { encoding: 'utf-8' });
const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

rl.on('line', (line) => {
  if (limit && processed >= limit) {
    rl.close();
    return;
  }

  const currentLineIndex = lineIndex;
  lineIndex += 1;
  const solutionRaw = solutionLines[currentLineIndex] || '';
  const trimmed = line.trim();
  if (!trimmed) {
    return;
  }

  const normalized = trimmed.replace(/\./g, '0');
  if (normalized.length !== 81 || /[^0-9]/.test(normalized)) {
    console.warn(
      `⚠️  Skipping puzzle ${currentLineIndex + 1}: Expected 81 numeric chars, got "${trimmed}"`
    );
    return;
  }

  const classification = classifyPuzzle(normalized);
  const { clues, zeros, difficulty, metrics, score } = classification;

  const solutionNormalized = solutionRaw.trim().replace(/\./g, '0');
  if (solutionNormalized.length !== 81 || /[^0-9]/.test(solutionNormalized)) {
    console.warn(
      `⚠️  Solution mismatch for puzzle ${currentLineIndex + 1}: got "${solutionRaw}"`
    );
  }

  processed += 1;
  stats[difficulty] += 1;

  results.push({
    board: normalized,
    difficulty,
    solution: solutionNormalized,
  });

  if (verbose) {
    console.log(
      `${processed}\tclues=${clues}\tzeros=${zeros}\tlzRow=${metrics.longestZeroRow}\tlzCol=${metrics.longestZeroColumn}\tminRow=${metrics.minRowClues}\tminCol=${metrics.minColClues}\tminBox=${metrics.minBoxClues}\tcRows=${metrics.centralRowClues}\tcCols=${metrics.centralColClues}\tscore=${score
        .toFixed(2)
        .padEnd(4, '0')}\tdifficulty=${difficulty}`
    );
  }
});

rl.on('close', () => {
  const dirName = path.dirname(outputPath);
  try {
    fs.mkdirSync(dirName, { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`\nSaved ${results.length} entries to ${outputPath}`);
  } catch (err) {
    console.error('❌ Failed to write output JSON:', err.message);
  }

  console.log(`\nPuzzle file: ${puzzlePath}`);
  console.log(`Solution file: ${solutionPath}`);
  console.log(`Env file: ${envPath}`);
  console.log('Summary');
  console.log('-------');
  console.log(`total puzzles processed: ${processed}`);
  DIFFICULTY_LEVELS.forEach((level) => {
    console.log(`${level}: ${stats[level]}`);
  });
});

rl.on('error', (err) => {
  console.error('❌ Failed to read puzzle file:', err);
  process.exit(1);
});
