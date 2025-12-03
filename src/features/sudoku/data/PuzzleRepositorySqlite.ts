import { getDb } from '../../../core/db/sqlite';
import { log, warn } from '../../../core/logger/log';
import { seededRandom } from '../../../core/utils/seededRandom';

export type Difficulty = 'beginner' | 'easy' | 'medium' | 'hard' | 'expert';
export type Grid = number[][];
export type Pair = { puzzle: Grid; solution: Grid; meta: { id: number | string; line?: number; difficulty: Difficulty } };

const toGrid = (s: string): Grid => {
  // Puzzle string is 81 chars of 0-9.
  const str = (s ?? '').replace(/[^0-9]/g, '').slice(0, 81).padEnd(81, '0');
  const g: Grid = [];
  for (let i = 0; i < 81; i += 9) g.push(str.slice(i, i + 9).split('').map(ch => Number(ch)));
  return g;
};

// Map app difficulty string to DB integer
// 0: Beginner
// 1: Easy
// 2: Medium
// 3: Hard
// 4: Expert
const difficultyToInt = (diff: Difficulty): number[] => {
  switch (diff) {
    case 'beginner': return [0];
    case 'easy': return [1];
    case 'medium': return [2];
    case 'hard': return [3];
    case 'expert': return [4];
    default: return [1];
  }
};

export async function getRandomPairByDifficulty(diff: Difficulty): Promise<Pair> {
  const db = await getDb();
  const diffInts = difficultyToInt(diff);
  const diffStr = diffInts.join(',');

  await log('PUZZLE', 'sqlite query start', { diff, diffInts });

  // Use ORDER BY RANDOM() LIMIT 1
  // Note: This can be slow on very large tables, but usually fine for < 100k rows on device.
  // If performance is an issue, we can switch to COUNT -> OFFSET method.
  const query = `SELECT id, puzzle, solution, difficulty FROM puzzles WHERE difficulty IN (${diffStr}) ORDER BY RANDOM() LIMIT 1`;

  try {
    const [res] = await db.executeSql(query);
    if (res.rows.length === 0) {
      await warn('PUZZLE', 'no row found', { diff });
      throw new Error(`No puzzle found for difficulty ${diff}`);
    }

    const row = res.rows.item(0);
    await log('PUZZLE', 'picked', { id: row.id, difficulty: row.difficulty });

    return {
      puzzle: toGrid(row.puzzle),
      solution: toGrid(row.solution),
      meta: { id: row.id, difficulty: diff },
    };
  } catch (e: any) {
    await warn('PUZZLE', 'sqlite query failed', { error: String(e?.message ?? e) });
    await debugDbStatus(db);
    throw e;
  }
}

export async function getDailyPuzzle(dateString: string): Promise<Pair> {
  const db = await getDb();
  await log('PUZZLE', 'getDailyPuzzle start', { dateString });

  try {
    // 1. Try to get from daily_schedule
    try {
      const [scheduleRes] = await db.executeSql(`SELECT puzzle_id, difficulty_str FROM daily_schedule WHERE date = ?`, [dateString]);

      if (scheduleRes.rows.length > 0) {
        const scheduleRow = scheduleRes.rows.item(0);
        const puzzleId = scheduleRow.puzzle_id;
        const diffStr = scheduleRow.difficulty_str as Difficulty;

        await log('PUZZLE', 'found in daily_schedule', { dateString, puzzleId, diffStr });

        const [puzzleRes] = await db.executeSql(`SELECT id, puzzle, solution FROM puzzles WHERE id = ?`, [puzzleId]);
        if (puzzleRes.rows.length > 0) {
          const row = puzzleRes.rows.item(0);
          return {
            puzzle: toGrid(row.puzzle),
            solution: toGrid(row.solution),
            meta: { id: row.id, difficulty: diffStr },
          };
        } else {
          await warn('PUZZLE', 'scheduled puzzle not found in puzzles table', { puzzleId });
          // Fallback to random generation
        }
      } else {
        await log('PUZZLE', 'not found in daily_schedule, using fallback', { dateString });
      }
    } catch (tableError) {
      await warn('PUZZLE', 'daily_schedule table query failed (likely missing), using fallback', { error: String(tableError) });
    }

    // 2. Fallback: Generate based on rules
    const date = new Date(dateString);
    const day = date.getDay(); // 0=Sun, 1=Mon...

    let diff: Difficulty = 'medium';
    let diffInt = 2;

    if (day === 0) { // Sun
      diff = 'expert';
      diffInt = 4;
    } else if (day >= 1 && day <= 3) { // Mon-Wed
      diff = 'beginner';
      diffInt = 0;
    } else { // Thu-Sat
      diff = 'medium';
      diffInt = 2;
    }

    // Get total count
    const [countRes] = await db.executeSql(`SELECT count(*) as c FROM puzzles WHERE difficulty = ?`, [diffInt]);
    const totalCount = countRes.rows.item(0).c;

    if (totalCount === 0) {
      throw new Error(`No puzzles found for difficulty ${diff} in fallback`);
    }

    // Generate seeded random index
    const rng = seededRandom(dateString);
    const randomIndex = Math.floor(rng() * totalCount);

    const query = `SELECT id, puzzle, solution, difficulty FROM puzzles WHERE difficulty = ? LIMIT 1 OFFSET ?`;
    const [res] = await db.executeSql(query, [diffInt, randomIndex]);

    if (res.rows.length === 0) {
      throw new Error(`Failed to fetch daily puzzle at offset ${randomIndex}`);
    }

    const row = res.rows.item(0);
    await log('PUZZLE', 'daily puzzle picked (fallback)', { id: row.id, dateString, index: randomIndex, difficulty: diff });

    return {
      puzzle: toGrid(row.puzzle),
      solution: toGrid(row.solution),
      meta: { id: row.id, difficulty: diff },
    };
  } catch (e: any) {
    await warn('PUZZLE', 'getDailyPuzzle failed', { error: String(e?.message ?? e) });
    throw e;
  }
}

async function debugDbStatus(db: any) {
  try {
    const [tables] = await db.executeSql("SELECT name FROM sqlite_master WHERE type='table'");
    const tableNames = [];
    for (let i = 0; i < tables.rows.length; i++) {
      tableNames.push(tables.rows.item(i).name);
    }
    await warn('DB_DEBUG', 'Tables in DB', { tables: tableNames });

    if (tableNames.includes('puzzles')) {
      const [count] = await db.executeSql('SELECT count(*) as c, difficulty FROM puzzles GROUP BY difficulty');
      const counts: any = {};
      for (let i = 0; i < count.rows.length; i++) {
        const r = count.rows.item(i);
        counts[r.difficulty] = r.c;
      }
      await warn('DB_DEBUG', 'Puzzles count by difficulty', counts);
    } else {
      await warn('DB_DEBUG', 'puzzles table missing!');
    }
  } catch (e: any) {
    await warn('DB_DEBUG', 'Failed to check DB status', { error: String(e?.message ?? e) });
  }
}

// Deprecated or unused, but kept for compatibility if needed (though we should remove usage)
export async function getRandomFromTable(table: Difficulty | 'euler'): Promise<Pair> {
  // Redirect to new function if it matches difficulty
  if (table === 'euler') throw new Error('Euler table not supported in new schema');
  return getRandomPairByDifficulty(table as Difficulty);
}
