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
    dailyPuzzleDate?: string;
}

export interface UserStats {
    userId: string;
    displayName?: string;
    gamesPlayed: number;
    wins: number;
    losses: number;
    winRate: number;
    bestWinStreak: number;
    currentWinStreak: number;
    // Daily Challenge Specific Stats
    dailyBestWinStreak: number;
    dailyCurrentWinStreak: number;
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
    // New fields for difficulty-specific stats
    difficultyStreaks: {
        [key in Difficulty]: {
            current: number;
            best: number;
        };
    };
    totalTimes: {
        [key in Difficulty]: number;
    };
    averageTimes: {
        [key in Difficulty]: number;
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
    dailyBestWinStreak: 0,
    dailyCurrentWinStreak: 0,
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
    difficultyStreaks: {
        beginner: { current: 0, best: 0 },
        easy: { current: 0, best: 0 },
        medium: { current: 0, best: 0 },
        hard: { current: 0, best: 0 },
        expert: { current: 0, best: 0 },
    },
    totalTimes: {
        beginner: 0,
        easy: 0,
        medium: 0,
        hard: 0,
        expert: 0,
    },
    averageTimes: {
        beginner: 0,
        easy: 0,
        medium: 0,
        hard: 0,
        expert: 0,
    },
};

const GAMES_COLLECTION = 'games_v2';
const USER_STATS_COLLECTION = 'user_stats_v2';
const DAILY_CHALLENGE_LEADERBOARD_COLLECTION = 'daily_challenge_leaderboard';

const getDailyKey = (d: Date): string => {
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
};

export const updateUserNickname = async (userId: string, nickname: string) => {
    const db = getFirestore();
    const userStatsRef = doc(db, USER_STATS_COLLECTION, userId);

    const now = new Date();
    const dailyKey = getDailyKey(now);

    const dailyChallengeRef = doc(db, DAILY_CHALLENGE_LEADERBOARD_COLLECTION, `${dailyKey}_${userId}`);

    try {
        await runTransaction(db, async (transaction) => {
            // 1. Update User Stats (All Time)
            const userStatsDoc = await transaction.get(userStatsRef);
            if (!userStatsDoc.exists()) {
                const stats = JSON.parse(JSON.stringify(DEFAULT_STATS));
                stats.userId = userId;
                stats.displayName = nickname;
                transaction.set(userStatsRef, stats);
            } else {
                transaction.update(userStatsRef, { displayName: nickname });
            }

            // 2. Update Daily Challenge Leaderboard (if exists)
            const dailyChallengeDoc = await transaction.get(dailyChallengeRef);
            if (dailyChallengeDoc.exists()) {
                transaction.update(dailyChallengeRef, { displayName: nickname });
            }
        });
        await AppLogger.info('STATS', 'User nickname updated', { userId, nickname });
    } catch (error: any) {
        await AppLogger.error('STATS', 'Failed to update nickname', { error: error.message });
        throw error;
    }
};

const updateStatsObject = (stats: UserStats, gameResult: GameResult, userDisplayName?: string, isDailyChallenge: boolean = false) => {
    if (!stats.userId) stats.userId = gameResult.userId;

    // Migration/Init for new fields
    if (!stats.gamesPlayedCounts) stats.gamesPlayedCounts = { ...DEFAULT_STATS.gamesPlayedCounts };
    if (!stats.winRates) stats.winRates = { ...DEFAULT_STATS.winRates };
    if (!stats.difficultyStreaks) stats.difficultyStreaks = JSON.parse(JSON.stringify(DEFAULT_STATS.difficultyStreaks));
    if (!stats.totalTimes) stats.totalTimes = { ...DEFAULT_STATS.totalTimes };
    if (!stats.averageTimes) stats.averageTimes = { ...DEFAULT_STATS.averageTimes };

    if (stats.dailyBestWinStreak === undefined) stats.dailyBestWinStreak = 0;
    if (stats.dailyCurrentWinStreak === undefined) stats.dailyCurrentWinStreak = 0;

    // Nickname logic
    if (!stats.displayName) {
        stats.displayName = userDisplayName || getRandomNickname();
    }

    stats.gamesPlayed += 1;
    stats.totalTimeSeconds += gameResult.durationSeconds;
    stats.gamesPlayedCounts[gameResult.difficulty] += 1;

    // Update difficulty total time
    stats.totalTimes[gameResult.difficulty] += gameResult.durationSeconds;

    if (gameResult.result === 'win') {
        stats.wins += 1;
        stats.currentWinStreak += 1;
        if (stats.currentWinStreak > stats.bestWinStreak) {
            stats.bestWinStreak = stats.currentWinStreak;
        }

        // Difficulty Specific Streak
        stats.difficultyStreaks[gameResult.difficulty].current += 1;
        if (stats.difficultyStreaks[gameResult.difficulty].current > stats.difficultyStreaks[gameResult.difficulty].best) {
            stats.difficultyStreaks[gameResult.difficulty].best = stats.difficultyStreaks[gameResult.difficulty].current;
        }

        // Daily Challenge Specific Streak
        if (isDailyChallenge) {
            stats.dailyCurrentWinStreak += 1;
            if (stats.dailyCurrentWinStreak > stats.dailyBestWinStreak) {
                stats.dailyBestWinStreak = stats.dailyCurrentWinStreak;
            }
        }

        stats.completedCounts[gameResult.difficulty] += 1;

        const currentBest = stats.bestTimes[gameResult.difficulty];
        if (currentBest === null || gameResult.durationSeconds < currentBest) {
            stats.bestTimes[gameResult.difficulty] = gameResult.durationSeconds;
        }
    } else {
        stats.losses += 1;
        stats.currentWinStreak = 0;

        // Reset Difficulty Streak
        stats.difficultyStreaks[gameResult.difficulty].current = 0;

        // Daily Challenge Specific Streak Reset
        if (isDailyChallenge) {
            stats.dailyCurrentWinStreak = 0;
        }
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

    // Recalculate difficulty-specific average time
    // Only count completed games (wins) for average time? Usually average time is for solved puzzles.
    // Let's use completedCounts for average time calculation to be consistent with "Average Time to Solve".
    if (stats.completedCounts[gameResult.difficulty] > 0) {
        // Note: totalTimes currently includes failed attempts if we just add durationSeconds.
        // If we want "Average Solve Time", we should probably only add time for WINS to a separate counter, 
        // OR assume totalTimes is fine. 
        // Let's stick to: Average Time = Total Time Spent / Games Played (including losses) OR Total Time / Wins?
        // Usually "Average Time" in Sudoku apps implies "Average Time for Solved Puzzles".
        // But `totalTimes` above adds duration for ALL games.
        // Let's adjust: Only add to `totalTimes` if it's a WIN? 
        // No, let's keep `totalTimes` as "Time Spent".
        // BUT for the UI "Average Time", users usually expect "Average Winning Time".
        // Let's refine: Only add to `totalTimes` if result is 'win' for the purpose of "Average Time".
        // Wait, `stats.totalTimeSeconds` adds all duration. 
        // Let's make `averageTimes` be "Average Time per Completed Game".

        // RE-LOGIC: Only add to totalTimes if win? 
        // If I change logic now, I need to be careful. 
        // Let's assume `totalTimes` tracks ALL time. 
        // Then `averageTimes` = `totalTimes` / `gamesPlayedCounts`. This is "Average Duration per Game".
        // If user wants "Average Solve Time", we need a separate `totalSolveTime`.
        // Given the prompt "평균시간", usually means solve time.
        // Let's modify: `totalTimes` will track ALL time. 
        // But I will calculate average based on `completedCounts` if I want solve time? No that's inaccurate if I include loss time.

        // Let's stick to: Average Time = Total Time / Games Played. This is simple and consistent.
        stats.averageTimes[gameResult.difficulty] = stats.totalTimes[gameResult.difficulty] / stats.gamesPlayedCounts[gameResult.difficulty];
    }

    return stats;
};

export const saveGameResult = async (gameResult: GameResult, userDisplayName?: string, isDailyChallenge: boolean = false) => {
    const db = getFirestore();
    const now = new Date();
    const dailyKey = getDailyKey(now);

    const userStatsRef = doc(db, USER_STATS_COLLECTION, gameResult.userId);

    // Daily Challenge Ref
    const leaderboardDateKey = (isDailyChallenge && gameResult.dailyPuzzleDate) ? gameResult.dailyPuzzleDate : dailyKey;
    const dailyChallengeRef = isDailyChallenge
        ? doc(db, DAILY_CHALLENGE_LEADERBOARD_COLLECTION, `${leaderboardDateKey}_${gameResult.userId}`)
        : null;

    try {
        console.log('StatsRepository: Saving game result...', { ...gameResult, isDailyChallenge });
        await runTransaction(db, async (transaction) => {
            // 1. Save individual game result
            const newGameRef = doc(collection(db, GAMES_COLLECTION));
            transaction.set(newGameRef, {
                ...gameResult,
                createdAt: Timestamp.now(),
                dailyKey, // This remains the completion date
                isDailyChallenge,
            });

            // 2. Read all stats docs
            const userStatsDoc = await transaction.get(userStatsRef);

            // 3. Prepare stats objects
            let allTimeStats = userStatsDoc.exists() ? (userStatsDoc.data() as UserStats) : JSON.parse(JSON.stringify(DEFAULT_STATS));

            // 4. Update all stats
            // Ensure nickname consistency: use existing all-time nickname for daily/weekly if available
            const currentNickname = allTimeStats.displayName || userDisplayName || getRandomNickname();

            // Update All Time
            allTimeStats = updateStatsObject(allTimeStats, gameResult, currentNickname, isDailyChallenge);

            // 5. Write back
            transaction.set(userStatsRef, allTimeStats);

            // 6. Handle Daily Challenge Specifics
            if (isDailyChallenge && dailyChallengeRef) {
                const dailyChallengeDoc = await transaction.get(dailyChallengeRef);

                if (!dailyChallengeDoc.exists()) {
                    transaction.set(dailyChallengeRef, {
                        userId: gameResult.userId,
                        displayName: currentNickname,
                        durationSeconds: gameResult.durationSeconds,
                        mistakes: gameResult.mistakes,
                        completedAt: Timestamp.now(),
                        dailyKey: leaderboardDateKey,
                    });
                } else {
                    const currentData = dailyChallengeDoc.data();
                    // Update only if better time (lower duration)
                    if (currentData && gameResult.durationSeconds < currentData.durationSeconds) {
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
                if (!data.difficultyStreaks) data.difficultyStreaks = JSON.parse(JSON.stringify(DEFAULT_STATS.difficultyStreaks));
                if (!data.totalTimes) data.totalTimes = { ...DEFAULT_STATS.totalTimes };
                if (!data.averageTimes) data.averageTimes = { ...DEFAULT_STATS.averageTimes };
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
export type LeaderboardPeriod = 'all_time';

export const getLeaderboard = async (
    metric: LeaderboardMetric,
    difficulty: Difficulty,
    period: LeaderboardPeriod = 'all_time',
    limitCount: number = 20
): Promise<UserStats[]> => {
    const db = getFirestore();
    let collectionName = USER_STATS_COLLECTION;

    let q;
    const constraints: any[] = [];

    // All-time logic remains server-side sorted (assuming indexes exist or single field)
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

        let leaderboard: UserStats[] = [];
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
        querySnapshot.forEach((doc: any) => {
            leaderboard.push(doc.data());
        });
        return leaderboard;
    } catch (error: any) {
        console.error('StatsRepository: Failed to fetch daily challenge leaderboard', error);
        return [];
    }
};

export const getStreakLeaderboard = async (limitCount: number = 20): Promise<UserStats[]> => {
    const db = getFirestore();
    const q = query(
        collection(db, USER_STATS_COLLECTION),
        orderBy('dailyBestWinStreak', 'desc'),
        firestoreLimit(limitCount)
    );

    try {
        const querySnapshot = await getDocs(q);
        const leaderboard: UserStats[] = [];
        querySnapshot.forEach((doc: any) => {
            leaderboard.push(doc.data() as UserStats);
        });
        return leaderboard;
    } catch (error: any) {
        console.error('StatsRepository: Failed to fetch streak leaderboard', error);
        return [];
    }
};

export interface DifficultyPercentiles {
    gamesPlayed: number;
    winRate: number;
    bestWinStreak: number;
    averageTime: number;
    bestTime: number;
}

export const getDifficultyPercentiles = async (userId: string, difficulty: Difficulty, stats: UserStats): Promise<DifficultyPercentiles> => {
    const db = getFirestore();
    const collectionRef = collection(db, USER_STATS_COLLECTION);

    // Default to bottom 100% if no data
    const result: DifficultyPercentiles = {
        gamesPlayed: 0,
        winRate: 0,
        bestWinStreak: 0,
        averageTime: 0,
        bestTime: 0
    };

    try {
        // 1. Total Users Count
        // Let's try to import `getCountFromServer`.
        const { getCountFromServer } = require('@react-native-firebase/firestore');

        const totalUsersQuery = query(collectionRef);
        const totalUsersSnapshotAgg = await getCountFromServer(totalUsersQuery);
        const totalUsers = totalUsersSnapshotAgg.data().count;

        if (totalUsers === 0) return result;

        // Helper to calculate percentile
        const calculatePercentile = async (fieldPath: string, op: '<' | '>' | '==', value: number, sortOrder: 'asc' | 'desc') => {
            if (value === 0 || value === null) return 0; // No data usually means bottom

            let betterQuery;
            if (sortOrder === 'desc') {
                betterQuery = query(collectionRef, where(fieldPath, '>', value));
            } else {
                betterQuery = query(collectionRef, where(fieldPath, '<', value), where(fieldPath, '!=', null)); // Exclude nulls for time
            }

            const betterSnapshot = await getCountFromServer(betterQuery);
            const betterCount = betterSnapshot.data().count;
            const rank = betterCount + 1;

            // Top X % = (Rank / Total) * 100
            return (rank / totalUsers) * 100;
        };

        // 2. Calculate for each metric
        const gamesPlayed = stats.completedCounts?.[difficulty] ?? 0;
        result.gamesPlayed = await calculatePercentile(`completedCounts.${difficulty}`, '>', gamesPlayed, 'desc');

        const winRate = stats.winRates?.[difficulty] ?? 0;
        result.winRate = await calculatePercentile(`winRates.${difficulty}`, '>', winRate, 'desc');

        const bestStreak = stats.difficultyStreaks?.[difficulty]?.best ?? 0;
        result.bestWinStreak = await calculatePercentile(`difficultyStreaks.${difficulty}.best`, '>', bestStreak, 'desc');

        const avgTime = stats.averageTimes?.[difficulty] ?? 0;
        if (avgTime > 0) {
            result.averageTime = await calculatePercentile(`averageTimes.${difficulty}`, '<', avgTime, 'asc');
        }

        const bestTime = stats.bestTimes?.[difficulty];
        if (bestTime !== null && bestTime !== undefined) {
            result.bestTime = await calculatePercentile(`bestTimes.${difficulty}`, '<', bestTime, 'asc');
        }

        return result;

    } catch (error) {
        console.error('StatsRepository: Failed to calculate percentiles', error);
        return result;
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

        const dates = snapshot.docs
            .map((d: any) => d.data())
            .filter((data: any) => {
                // Strict check: Puzzle date must match completion date (dailyKey)
                if (data.dailyPuzzleDate && data.dailyPuzzleDate !== data.dailyKey) {
                    return false;
                }
                return true;
            })
            .map((data: any) => data.dailyKey); // YYYY-MM-DD

        const uniqueDates = Array.from(new Set(dates)).sort().reverse();

        if (uniqueDates.length === 0) return 0;

        const today = getDailyKey(new Date());
        const yesterday = getDailyKey(new Date(Date.now() - 86400000));

        if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
            return 0;
        }

        let streak = 1;
        let currentDate = new Date(uniqueDates[0] as string);

        for (let i = 1; i < uniqueDates.length; i++) {
            const prevDate = new Date(uniqueDates[i] as string);
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

export const syncDailyStreak = async (userId: string) => {
    const db = getFirestore();
    const userStatsRef = doc(db, USER_STATS_COLLECTION, userId);

    try {
        // 1. Calculate actual streak
        const actualStreak = await getDailyStreak(userId);

        // 2. Update DB if needed
        await runTransaction(db, async (transaction) => {
            const userStatsDoc = await transaction.get(userStatsRef);
            if (!userStatsDoc.exists()) return;

            const stats = userStatsDoc.data() as UserStats;
            if (stats.dailyCurrentWinStreak !== actualStreak) {
                const updates: any = { dailyCurrentWinStreak: actualStreak };
                // Also update best streak if current is higher
                if (actualStreak > (stats.dailyBestWinStreak || 0)) {
                    updates.dailyBestWinStreak = actualStreak;
                }
                transaction.update(userStatsRef, updates);
                console.log(`StatsRepository: Synced daily streak. Old: ${stats.dailyCurrentWinStreak}, New: ${actualStreak}`);
            }
        });
    } catch (error) {
        console.error('StatsRepository: Failed to sync daily streak', error);
    }
};

export const cleanupInvalidGames = async (userId: string) => {
    const db = getFirestore();
    const gamesRef = collection(db, GAMES_COLLECTION);
    const q = query(gamesRef, where('userId', '==', userId));

    try {
        console.log('StatsRepository: Starting cleanup for user', userId);
        const snapshot = await getDocs(q);
        const batch = db.batch();
        let deletedCount = 0;
        const validGames: GameResult[] = [];
        const affectedDailyKeys = new Set<string>();

        snapshot.forEach((doc) => {
            const data = doc.data() as any;
            if (data.durationSeconds === 0) {
                batch.delete(doc.ref);
                deletedCount++;
                if (data.dailyKey) affectedDailyKeys.add(data.dailyKey);
            } else {
                validGames.push(data as GameResult);
            }
        });

        if (deletedCount > 0) {
            console.log(`StatsRepository: Deleting ${deletedCount} invalid games...`);
            await batch.commit();
        } else {
            console.log('StatsRepository: No invalid games found to delete. Proceeding with recalculation...');
        }

        // Recalculate stats from scratch (ALWAYS run this to fix desync)
        console.log('StatsRepository: Recalculating stats...');

        // 1. Fetch current nickname
        let currentNickname = getRandomNickname();
        const userStatsRef = doc(db, USER_STATS_COLLECTION, userId);
        const currentStatsDoc = await getDocs(query(collection(db, USER_STATS_COLLECTION), where('userId', '==', userId), firestoreLimit(1)));
        if (!currentStatsDoc.empty) {
            const currentData = currentStatsDoc.docs[0].data();
            if (currentData.displayName) {
                currentNickname = currentData.displayName;
            }
        }

        // 2. Rebuild All Time Stats
        let newAllTimeStats = JSON.parse(JSON.stringify(DEFAULT_STATS));
        newAllTimeStats.userId = userId;
        newAllTimeStats.displayName = currentNickname;

        // Sort by time for streak calculation
        validGames.sort((a, b) => a.startTime - b.startTime);

        for (const game of validGames) {
            const isDaily = (game as any).isDailyChallenge === true;
            newAllTimeStats = updateStatsObject(newAllTimeStats, game, currentNickname, isDaily);
        }

        // 3. Rebuild Affected Daily Stats & Daily Challenge Leaderboard
        const validDailyKeys = new Set<string>();
        validGames.forEach((g: any) => {
            if (g.dailyKey) validDailyKeys.add(g.dailyKey);
        });

        const allDailyKeys = new Set<string>([...affectedDailyKeys, ...validDailyKeys]);

        const dailyUpdates: Promise<void>[] = [];

        for (const dailyKey of allDailyKeys) {
            // Filter games for this day
            const dailyGames = validGames.filter((g: any) => g.dailyKey === dailyKey);

            const dailyChallengeRef = doc(db, DAILY_CHALLENGE_LEADERBOARD_COLLECTION, `${dailyKey}_${userId}`);

            if (dailyGames.length === 0) {
                // No valid games left for this day -> Delete stats
                dailyUpdates.push(runTransaction(db, async (t) => {
                    t.delete(dailyChallengeRef);
                }));
                continue;
            }

            let bestDailyChallengeTime: number | null = null;
            let bestDailyChallengeMistakes: number = 0;

            for (const game of dailyGames) {
                const isDaily = (game as any).isDailyChallenge === true;

                if (isDaily && game.result === 'win') {
                    if (bestDailyChallengeTime === null || game.durationSeconds < bestDailyChallengeTime) {
                        bestDailyChallengeTime = game.durationSeconds;
                        bestDailyChallengeMistakes = game.mistakes;
                    }
                }
            }

            // Update Daily Challenge Leaderboard Doc
            dailyUpdates.push(runTransaction(db, async (t) => {
                if (bestDailyChallengeTime !== null) {
                    t.set(dailyChallengeRef, {
                        userId,
                        displayName: currentNickname,
                        durationSeconds: bestDailyChallengeTime,
                        mistakes: bestDailyChallengeMistakes,
                        completedAt: Timestamp.now(), // Approximate
                        dailyKey,
                    });
                } else {
                    // If no valid wins left for this day, delete the entry
                    t.delete(dailyChallengeRef);
                }
            }));
        }

        // Execute all updates
        await Promise.all([
            runTransaction(db, async (t) => { t.set(userStatsRef, newAllTimeStats); }),
            ...dailyUpdates
        ]);

        console.log('StatsRepository: Cleanup complete. Stats updated.');
        return deletedCount;
    } catch (error: any) {
        console.error('StatsRepository: Cleanup failed', error);
        throw error;
    }
};
