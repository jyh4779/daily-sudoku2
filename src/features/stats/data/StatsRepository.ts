import { getFirestore, collection, addDoc, query, where, onSnapshot, Timestamp, orderBy } from '@react-native-firebase/firestore';
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

export const saveGameResult = async (gameResult: GameResult) => {
    try {
        const db = getFirestore();
        await addDoc(collection(db, GAMES_COLLECTION), {
            ...gameResult,
            createdAt: Timestamp.now(),
        });
        await AppLogger.info('STATS', 'Game result saved', { userId: gameResult.userId, result: gameResult.result });
    } catch (error: any) {
        await AppLogger.error('STATS', 'Failed to save game result', { error: error.message });
        throw error;
    }
};

export const subscribeToUserStats = (userId: string, onUpdate: (stats: UserStats) => void) => {
    const db = getFirestore();
    const q = query(
        collection(db, GAMES_COLLECTION),
        where('userId', '==', userId),
        orderBy('endTime', 'asc')
    );

    return onSnapshot(
        q,
        querySnapshot => {
            const stats: UserStats = JSON.parse(JSON.stringify(DEFAULT_STATS));
            let currentStreak = 0;

            querySnapshot.forEach(doc => {
                const game = doc.data() as GameResult;

                stats.gamesPlayed += 1;
                stats.totalTimeSeconds += game.durationSeconds;

                if (game.result === 'win') {
                    stats.wins += 1;
                    currentStreak += 1;
                    if (currentStreak > stats.bestWinStreak) {
                        stats.bestWinStreak = currentStreak;
                    }
                    stats.completedCounts[game.difficulty] += 1;

                    const currentBest = stats.bestTimes[game.difficulty];
                    if (currentBest === null || game.durationSeconds < currentBest) {
                        stats.bestTimes[game.difficulty] = game.durationSeconds;
                    }
                } else {
                    stats.losses += 1;
                    currentStreak = 0;
                }
            });

            stats.currentWinStreak = currentStreak;

            // Calculate derived stats
            if (stats.gamesPlayed > 0) {
                stats.winRate = stats.wins / stats.gamesPlayed;
                stats.averageTimeSeconds = stats.totalTimeSeconds / stats.gamesPlayed;
            } else {
                stats.winRate = 0;
                stats.averageTimeSeconds = 0;
            }

            onUpdate(stats);
        },
        error => {
            console.warn('StatsRepository: Stats subscription error', error);
            // Fallback or empty stats could be handled here
        }
    );
};
