import SQLite from 'react-native-sqlite-storage';
import { log, warn } from '../logger/log';

SQLite.enablePromise(true);

export async function getDb() {
  await log('DB', 'openDatabase begin');
  const db = await SQLite.openDatabase({
    name: 'sudoku_v2.db',
    location: 'default',
    // Copies bundled DB from android/app/src/main/assets/sudoku_v2.db on first open
    createFromLocation: '~sudoku_v2.db',
  });
  await log('DB', 'openDatabase success');
  return db;
}

// Lightweight self test for development: list tables and count from easy
export async function dbSelfTest() {
  try {
    const db = await getDb();
    const [t] = await db.executeSql("SELECT name FROM sqlite_master WHERE type='table'");
    const tables: string[] = [];
    for (let i = 0; i < t.rows.length; i++) tables.push(t.rows.item(i).name);
    await log('DB', 'tables', { tables });

    const [cEasyTbl] = await db.executeSql(
      "SELECT COUNT(*) AS cnt FROM sqlite_master WHERE type='table' AND name='easy'"
    );
    const easyExists = cEasyTbl.rows.item(0).cnt > 0;
    if (easyExists) {
      const [pc] = await db.executeSql('SELECT COUNT(*) AS cnt FROM easy');
      await log('DB', 'easy count', { count: pc.rows.item(0).cnt });
    }
  } catch (e: any) {
    await warn('DB', 'self test failed', { error: String(e?.message ?? e) });
  }
}

export async function dbDebug_whereIsIt() {
  const db = await getDb();
  const [res] = await db.executeSql('PRAGMA database_list');
  const out: any[] = [];
  for (let i = 0; i < res.rows.length; i++) out.push(res.rows.item(i));
  await log('DB', 'database_list', { out });
}

