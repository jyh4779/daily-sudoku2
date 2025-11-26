import { getFirestore, collection, addDoc, query, where, onSnapshot, Timestamp, orderBy, doc, runTransaction, getDocs, limit as firestoreLimit } from '@react-native-firebase/firestore';
import AppLogger from '../../../core/logger/AppLogger';

export type Difficulty = 'beginner' | 'easy' | 'medium' | 'hard' | 'expert';

export interface GameResult {
    userId: string;
    difficulty: Difficulty;
    mistakes: number;
    startTime: number; // Unix timestamp (seconds)
    endTime: number;   // Unix timestamp (seconds)
    durationSeconds: number;
    result: 'win' | 'loss';
}

export interface UserStats {
    userId: string; // Added for leaderboard
    displayName?: string; // Added for leaderboard
    gamesPlayed: number;
    wins: number;
    losses: number;
    winRate: number;
    bestWinStreak: number;
    currentWinStreak: number;
    averageTimeSeconds: number;
    totalTimeSeconds: number;
    bestTimes: {
        beginner: number | null;
        easy: number | null;
        medium: number | null;
        hard: number | null;
        expert: number | null;
    };
    completedCounts: {
        beginner: number;
        easy: number;
        medium: number;
        hard: number;
        expert: number;
    };
}

const DEFAULT_STATS: UserStats = {
    userId: '',
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    bestWinStreak: 0,
    currentWinStreak: 0,
    averageTimeSeconds: 0,
    totalTimeSeconds: 0,
    bestTimes: {
        beginner: null,
        easy: null,
        medium: null,
        hard: null,
        expert: null,
    },
    completedCounts: {
        beginner: 0,
        easy: 0,
        medium: 0,
        hard: 0,
        expert: 0,
    },
};

const GAMES_COLLECTION = 'games';
const USER_STATS_COLLECTION = 'user_stats';

export const saveGameResult = async (gameResult: GameResult, userDisplayName?: string) => {
    const db = getFirestore();
    const userStatsRef = doc(db, USER_STATS_COLLECTION, gameResult.userId);

    try {
        await runTransaction(db, async (transaction) => {
            // 1. Save individual game result
            const newGameRef = doc(collection(db, GAMES_COLLECTION));
            transaction.set(newGameRef, {
                ...gameResult,
                createdAt: Timestamp.now(),
            });

            // 2. Update aggregated user stats
            const userStatsDoc = await transaction.get(userStatsRef);
            let stats: UserStats;

            if (userStatsDoc.exists) {
                stats = userStatsDoc.data() as UserStats;
            } else {
                stats = JSON.parse(JSON.stringify(DEFAULT_STATS));
                stats.userId = gameResult.userId;
            }

            if (userDisplayName) {
                stats.displayName = userDisplayName;
            }

            stats.gamesPlayed += 1;
            stats.totalTimeSeconds += gameResult.durationSeconds;

            if (gameResult.result === 'win') {
                stats.wins += 1;
                stats.currentWinStreak += 1;
                if (stats.currentWinStreak > stats.bestWinStreak) {
                    stats.bestWinStreak = stats.currentWinStreak;
                }
                stats.completedCounts[gameResult.difficulty] += 1;

                const currentBest = stats.bestTimes[gameResult.difficulty];
                if (currentBest === null || gameResult.durationSeconds < currentBest) {
                    stats.bestTimes[gameResult.difficulty] = gameResult.durationSeconds;
                }
            } else {
                stats.losses += 1;
                stats.currentWinStreak = 0;
            }

            // Recalculate derived stats
            if (stats.gamesPlayed > 0) {
                stats.winRate = stats.wins / stats.gamesPlayed;
                stats.averageTimeSeconds = stats.totalTimeSeconds / stats.gamesPlayed;
            }

            transaction.set(userStatsRef, stats);
        });

        await AppLogger.info('STATS', 'Game result and stats saved', { userId: gameResult.userId, result: gameResult.result });
    } catch (error: any) {
        await AppLogger.error('STATS', 'Failed to save game result', { error: error.message });
        throw error;
    }
};

export const subscribeToUserStats = (userId: string, onUpdate: (stats: UserStats) => void) => {
    const db = getFirestore();
    const docRef = doc(db, USER_STATS_COLLECTION, userId);

    return onSnapshot(
        docRef,
        docSnapshot => {
            if (docSnapshot.exists()) {
                onUpdate(docSnapshot.data() as UserStats);
            } else {
                onUpdate({ ...DEFAULT_STATS, userId });
            }
        },
        error => {
            console.warn('StatsRepository: Stats subscription error', error);
        }
    );
};

export type LeaderboardMetric = 'bestTime' | 'winRate' | 'wins';

export const getLeaderboard = async (metric: LeaderboardMetric, difficulty: Difficulty, limitCount: number = 20): Promise<UserStats[]> => {
    const db = getFirestore();
    let q;

    if (metric === 'bestTime') {
        // For best time, we want ascending order (lower is better), and ignore nulls
        q = query(
            collection(db, USER_STATS_COLLECTION),
            where(`bestTimes.${difficulty}`, '!=', null),
            orderBy(`bestTimes.${difficulty}`, 'asc'),
            firestoreLimit(limitCount)
        );
    } else if (metric === 'winRate') {
        q = query(
            collection(db, USER_STATS_COLLECTION),
            orderBy('winRate', 'desc'),
            firestoreLimit(limitCount)
        );
    } else { // wins
        q = query(
            collection(db, USER_STATS_COLLECTION),
            orderBy('wins', 'desc'),
            firestoreLimit(limitCount)
        );
    }

    try {
        const querySnapshot = await getDocs(q);
        const leaderboard: UserStats[] = [];
        querySnapshot.forEach(doc => {
            leaderboard.push(doc.data() as UserStats);
        });
        return leaderboard;
    } catch (error: any) {
        await AppLogger.error('STATS', 'Failed to fetch leaderboard', { error: error.message });
        return [];
    }
};
