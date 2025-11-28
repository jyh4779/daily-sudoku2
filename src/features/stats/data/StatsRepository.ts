import { getFirestore, collection, addDoc, query, where, onSnapshot, Timestamp, orderBy, doc, runTransaction, getDocs, limit as firestoreLimit } from '@react-native-firebase/firestore';
import AppLogger from '../../../core/logger/AppLogger';
import { getRandomNickname } from '../../../config/nicknames';

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
    gamesPlayedCounts: {
        beginner: number;
        easy: number;
        medium: number;
        hard: number;
        expert: number;
    };
    winRates: {
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
    gamesPlayedCounts: {
        beginner: 0,
        easy: 0,
        medium: 0,
        hard: 0,
        expert: 0,
    },
    winRates: {
        beginner: 0,
        easy: 0,
        medium: 0,
        hard: 0,
        expert: 0,
    },
};

const GAMES_COLLECTION = 'games_v2';
const USER_STATS_COLLECTION = 'user_stats_v2';
const LEADERBOARD_DAILY_COLLECTION = 'leaderboard_daily';
const LEADERBOARD_WEEKLY_COLLECTION = 'leaderboard_weekly';
const DAILY_CHALLENGE_LEADERBOARD_COLLECTION = 'daily_challenge_leaderboard';

// Helper to get ISO week number
const getWeekNumber = (d: Date): string => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${date.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
};

const getDailyKey = (d: Date): string => {
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
};

export const updateUserNickname = async (userId: string, nickname: string) => {
    const db = getFirestore();
    const userStatsRef = doc(db, USER_STATS_COLLECTION, userId);

    try {
        await runTransaction(db, async (transaction) => {
            const userStatsDoc = await transaction.get(userStatsRef);
            if (!userStatsDoc.exists()) {
                // Should not happen for existing users, but handle it
                const stats = JSON.parse(JSON.stringify(DEFAULT_STATS));
                stats.userId = userId;
                stats.displayName = nickname;
                transaction.set(userStatsRef, stats);
            } else {
                transaction.update(userStatsRef, { displayName: nickname });
            }
        });
        await AppLogger.info('STATS', 'User nickname updated', { userId, nickname });
    } catch (error: any) {
        await AppLogger.error('STATS', 'Failed to update nickname', { error: error.message });
        throw error;
    }
};

const updateStatsObject = (stats: UserStats, gameResult: GameResult, userDisplayName?: string) => {
    if (!stats.userId) stats.userId = gameResult.userId;

    // Migration/Init for new fields
    if (!stats.gamesPlayedCounts) stats.gamesPlayedCounts = { ...DEFAULT_STATS.gamesPlayedCounts };
    if (!stats.winRates) stats.winRates = { ...DEFAULT_STATS.winRates };

    // Nickname logic
    if (!stats.displayName) {
        stats.displayName = userDisplayName || getRandomNickname();
    }

    stats.gamesPlayed += 1;
    stats.totalTimeSeconds += gameResult.durationSeconds;
    stats.gamesPlayedCounts[gameResult.difficulty] += 1;

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

    // Self-healing: Ensure gamesPlayedCounts >= completedCounts
    if (stats.gamesPlayedCounts[gameResult.difficulty] < stats.completedCounts[gameResult.difficulty]) {
        stats.gamesPlayedCounts[gameResult.difficulty] = stats.completedCounts[gameResult.difficulty];
    }

    // Recalculate difficulty-specific win rate
    if (stats.gamesPlayedCounts[gameResult.difficulty] > 0) {
        stats.winRates[gameResult.difficulty] = stats.completedCounts[gameResult.difficulty] / stats.gamesPlayedCounts[gameResult.difficulty];
    }

    return stats;
};

export const saveGameResult = async (gameResult: GameResult, userDisplayName?: string, isDailyChallenge: boolean = false) => {
    const db = getFirestore();
    const now = new Date();
    const dailyKey = getDailyKey(now);
    const weeklyKey = getWeekNumber(now);

    const userStatsRef = doc(db, USER_STATS_COLLECTION, gameResult.userId);
    const dailyStatsRef = doc(db, LEADERBOARD_DAILY_COLLECTION, `${dailyKey}_${gameResult.userId}`);
    const weeklyStatsRef = doc(db, LEADERBOARD_WEEKLY_COLLECTION, `${weeklyKey}_${gameResult.userId}`);

    // Daily Challenge Ref
    const dailyChallengeRef = isDailyChallenge
        ? doc(db, DAILY_CHALLENGE_LEADERBOARD_COLLECTION, `${dailyKey}_${gameResult.userId}`)
        : null;

    try {
        console.log('StatsRepository: Saving game result...', { ...gameResult, isDailyChallenge });
        await runTransaction(db, async (transaction) => {
            // 1. Save individual game result
            const newGameRef = doc(collection(db, GAMES_COLLECTION));
            transaction.set(newGameRef, {
                ...gameResult,
                createdAt: Timestamp.now(),
                dailyKey,
                weeklyKey,
                isDailyChallenge,
            });

            // 2. Read all stats docs
            const userStatsDoc = await transaction.get(userStatsRef);
            const dailyStatsDoc = await transaction.get(dailyStatsRef);
            const weeklyStatsDoc = await transaction.get(weeklyStatsRef);

            // 3. Prepare stats objects
            let allTimeStats = userStatsDoc.exists() ? (userStatsDoc.data() as UserStats) : JSON.parse(JSON.stringify(DEFAULT_STATS));
            let dailyStats = dailyStatsDoc.exists() ? (dailyStatsDoc.data() as UserStats) : JSON.parse(JSON.stringify(DEFAULT_STATS));
            let weeklyStats = weeklyStatsDoc.exists() ? (weeklyStatsDoc.data() as UserStats) : JSON.parse(JSON.stringify(DEFAULT_STATS));

            // 4. Update all stats
            // Ensure nickname consistency: use existing all-time nickname for daily/weekly if available
            const currentNickname = allTimeStats.displayName || userDisplayName || getRandomNickname();

            // Update All Time
            allTimeStats = updateStatsObject(allTimeStats, gameResult, currentNickname);

            // Update Daily
            dailyStats = updateStatsObject(dailyStats, gameResult, currentNickname);
            dailyStats.userId = gameResult.userId;
            dailyStats.displayName = currentNickname;
            (dailyStats as any).periodKey = dailyKey;

            // Update Weekly
            weeklyStats = updateStatsObject(weeklyStats, gameResult, currentNickname);
            weeklyStats.userId = gameResult.userId;
            weeklyStats.displayName = currentNickname;
            (weeklyStats as any).periodKey = weeklyKey;

            // 5. Write back
            transaction.set(userStatsRef, allTimeStats);
            transaction.set(dailyStatsRef, dailyStats);
            transaction.set(weeklyStatsRef, weeklyStats);

            // 6. Handle Daily Challenge Specifics
            if (isDailyChallenge && dailyChallengeRef) {
                // For daily challenge, we just save the result to the leaderboard
                // We don't aggregate stats like wins/losses in a separate stats doc, 
                // we just store the best time for this user for this day.
                // Or simply store this run.
                // Let's store the best run for this user for this day.
                const dailyChallengeDoc = await transaction.get(dailyChallengeRef);

                if (!dailyChallengeDoc.exists()) {
                    transaction.set(dailyChallengeRef, {
                        userId: gameResult.userId,
                        displayName: currentNickname,
                        durationSeconds: gameResult.durationSeconds,
                        mistakes: gameResult.mistakes,
                        completedAt: Timestamp.now(),
                        dailyKey,
                    });
                } else {
                    const currentData = dailyChallengeDoc.data();
                    // Update only if better time (lower duration)
                    if (gameResult.durationSeconds < currentData.durationSeconds) {
                        transaction.update(dailyChallengeRef, {
                            durationSeconds: gameResult.durationSeconds,
                            mistakes: gameResult.mistakes,
                            completedAt: Timestamp.now(),
                            displayName: currentNickname, // Update nickname if changed
                        });
                    }
                }
            }
        });

        console.log('StatsRepository: Game result saved successfully');
        await AppLogger.info('STATS', 'Game result and stats saved', { userId: gameResult.userId, result: gameResult.result, isDailyChallenge });
    } catch (error: any) {
        console.error('StatsRepository: Failed to save game result', error);
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
                const data = docSnapshot.data() as UserStats;
                // Ensure new fields exist for UI safety
                if (!data.gamesPlayedCounts) data.gamesPlayedCounts = { ...DEFAULT_STATS.gamesPlayedCounts };
                if (!data.winRates) data.winRates = { ...DEFAULT_STATS.winRates };
                onUpdate(data);
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
export type LeaderboardPeriod = 'all_time' | 'weekly' | 'daily';

export const getLeaderboard = async (
    metric: LeaderboardMetric,
    difficulty: Difficulty,
    period: LeaderboardPeriod = 'all_time',
    limitCount: number = 20
): Promise<UserStats[]> => {
    const db = getFirestore();
    let collectionName = USER_STATS_COLLECTION;

    const now = new Date();
    let periodKey = '';
    if (period === 'daily') {
        collectionName = LEADERBOARD_DAILY_COLLECTION;
        periodKey = getDailyKey(now);
    } else if (period === 'weekly') {
        collectionName = LEADERBOARD_WEEKLY_COLLECTION;
        periodKey = getWeekNumber(now);
    }

    let q;
    const constraints = [];

    if (period !== 'all_time') {
        constraints.push(where('periodKey', '==', periodKey));
    }

    if (metric === 'bestTime') {
        constraints.push(where(`bestTimes.${difficulty}`, '!=', null));
        constraints.push(orderBy(`bestTimes.${difficulty}`, 'asc'));
    } else if (metric === 'winRate') {
        constraints.push(orderBy(`winRates.${difficulty}`, 'desc'));
    } else { // wins
        constraints.push(orderBy(`completedCounts.${difficulty}`, 'desc'));
    }

    constraints.push(firestoreLimit(limitCount));

    q = query(collection(db, collectionName), ...constraints);

    try {
        console.log(`StatsRepository: Fetching leaderboard for ${metric} / ${difficulty} / ${period}`);
        const querySnapshot = await getDocs(q);
        console.log(`StatsRepository: Leaderboard fetched. Count: ${querySnapshot.size}`);
        const leaderboard: UserStats[] = [];
        querySnapshot.forEach((doc: any) => {
            const data = doc.data() as UserStats;
            // Ensure new fields exist
            if (!data.gamesPlayedCounts) data.gamesPlayedCounts = { ...DEFAULT_STATS.gamesPlayedCounts };
            if (!data.winRates) data.winRates = { ...DEFAULT_STATS.winRates };
            leaderboard.push(data);
        });
        return leaderboard;
    } catch (error: any) {
        console.error('StatsRepository: Failed to fetch leaderboard', error);
        await AppLogger.error('STATS', 'Failed to fetch leaderboard', { error: error.message });
        return [];
    }
};

export const getDailyChallengeLeaderboard = async (dateString: string, limitCount: number = 20): Promise<any[]> => {
    const db = getFirestore();
    const q = query(
        collection(db, DAILY_CHALLENGE_LEADERBOARD_COLLECTION),
        where('dailyKey', '==', dateString),
        orderBy('durationSeconds', 'asc'),
        firestoreLimit(limitCount)
    );

    try {
        const querySnapshot = await getDocs(q);
        const leaderboard: any[] = [];
        querySnapshot.forEach((doc) => {
            leaderboard.push(doc.data());
        });
        return leaderboard;
    } catch (error: any) {
        console.error('StatsRepository: Failed to fetch daily challenge leaderboard', error);
        return [];
    }
};

export const getDailyStreak = async (userId: string): Promise<number> => {
    const db = getFirestore();
    const q = query(
        collection(db, GAMES_COLLECTION),
        where('userId', '==', userId),
        where('isDailyChallenge', '==', true),
        where('result', '==', 'win'),
        orderBy('createdAt', 'desc'),
        firestoreLimit(30)
    );

    try {
        const snapshot = await getDocs(q);
        if (snapshot.empty) return 0;

        const dates = snapshot.docs.map(d => {
            const data = d.data();
            return data.dailyKey; // YYYY-MM-DD
        });

        const uniqueDates = Array.from(new Set(dates)).sort().reverse();

        if (uniqueDates.length === 0) return 0;

        const today = getDailyKey(new Date());
        const yesterday = getDailyKey(new Date(Date.now() - 86400000));

        if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
            return 0;
        }

        let streak = 1;
        let currentDate = new Date(uniqueDates[0]);

        for (let i = 1; i < uniqueDates.length; i++) {
            const prevDate = new Date(uniqueDates[i]);
            const diffTime = Math.abs(currentDate.getTime() - prevDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                streak++;
                currentDate = prevDate;
            } else {
                break;
            }
        }

        return streak;
    } catch (error) {
        console.error('StatsRepository: Failed to calculate streak', error);
        return 0;
    }
};
