import { getApp } from '@react-native-firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  limit,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData,
} from '@react-native-firebase/firestore';
import type { Difficulty, Grid, Pair } from './PuzzleRepositorySqlite';
import { appendFileLog } from '../../../core/logger/fileLogger';

const toGrid = (s: string): Grid => {
  const str = (s ?? '').replace(/[^0-9]/g, '').slice(0, 81).padEnd(81, '0');
  const g: Grid = [];
  for (let i = 0; i < 81; i += 9) g.push(str.slice(i, i + 9).split('').map(ch => Number(ch)));
  return g;
};

export async function fetchRandomPuzzleByDifficulty(diff: Difficulty, fetchLimit = 25): Promise<Pair> {
  try {
  const app = getApp();
  const db = getFirestore(app);
  const puzzlesRef = collection(db, 'puzzles');
  const puzzlesQuery = query(puzzlesRef, where('difficulty', '==', diff), limit(fetchLimit));
  await appendFileLog('firestore query start', { diff, fetchLimit });
  const snapshot = await getDocs(puzzlesQuery);

  if (snapshot.empty) {
    await appendFileLog('firestore query empty', { diff });
    throw new Error(`No puzzles found for difficulty ${diff}`);
  }

  const docs: QueryDocumentSnapshot<DocumentData>[] = snapshot.docs;
  const doc = docs[Math.floor(Math.random() * docs.length)];
  const data = doc.data();
  await appendFileLog('firestore puzzle picked', { diff, docId: doc.id });

  if (typeof data.board !== 'string' || typeof data.solution !== 'string') {
    await appendFileLog('firestore puzzle invalid', { docId: doc.id });
    throw new Error(`Puzzle doc ${doc.id} missing board/solution`);
  }

  return {
    puzzle: toGrid(data.board),
    solution: toGrid(data.solution),
    meta: { id: doc.id, difficulty: diff },
  };
  } catch (error: any) {
    await appendFileLog('firestore fetch error', { diff, error: String(error?.message ?? error) });
    throw error;
  }
}
