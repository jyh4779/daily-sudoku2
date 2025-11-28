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

    const now = new Date();
    const dailyKey = getDailyKey(now);
    const weeklyKey = getWeekNumber(now);

    const dailyStatsRef = doc(db, LEADERBOARD_DAILY_COLLECTION, `${dailyKey}_${userId}`);
    const weeklyStatsRef = doc(db, LEADERBOARD_WEEKLY_COLLECTION, `${weeklyKey}_${userId}`);
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

            // 2. Update Daily Leaderboard (if exists)
            const dailyStatsDoc = await transaction.get(dailyStatsRef);
            if (dailyStatsDoc.exists()) {
                transaction.update(dailyStatsRef, { displayName: nickname });
            }

            // 3. Update Weekly Leaderboard (if exists)
            const weeklyStatsDoc = await transaction.get(weeklyStatsRef);
            if (weeklyStatsDoc.exists()) {
                transaction.update(weeklyStatsRef, { displayName: nickname });
            }

            // 4. Update Daily Challenge Leaderboard (if exists)
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
    if (stats.dailyBestWinStreak === undefined) stats.dailyBestWinStreak = 0;
    if (stats.dailyCurrentWinStreak === undefined) stats.dailyCurrentWinStreak = 0;

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
            allTimeStats = updateStatsObject(allTimeStats, gameResult, currentNickname, isDailyChallenge);

            // Update Daily
            dailyStats = updateStatsObject(dailyStats, gameResult, currentNickname, isDailyChallenge);
            dailyStats.userId = gameResult.userId;
            dailyStats.displayName = currentNickname;
            (dailyStats as any).periodKey = dailyKey;

            // Update Weekly
            weeklyStats = updateStatsObject(weeklyStats, gameResult, currentNickname, isDailyChallenge);
            weeklyStats.userId = gameResult.userId;
            weeklyStats.displayName = currentNickname;
            (weeklyStats as any).periodKey = weeklyKey;

            // 5. Write back
            transaction.set(userStatsRef, allTimeStats);
            transaction.set(dailyStatsRef, dailyStats);
            transaction.set(weeklyStatsRef, weeklyStats);

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
                        dailyKey,
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
    const constraints: any[] = [];

    // For daily/weekly, we fetch by periodKey and sort client-side to avoid index issues
    if (period !== 'all_time') {
        constraints.push(where('periodKey', '==', periodKey));
        // Fetch more than limit to allow for client-side filtering/sorting
        constraints.push(firestoreLimit(100));
    } else {
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
    }

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

        // Client-side sorting for daily/weekly
        if (period !== 'all_time') {
            leaderboard = leaderboard.filter(item => {
                if (metric === 'bestTime') {
                    return item.bestTimes && item.bestTimes[difficulty] !== null && item.bestTimes[difficulty] !== undefined;
                }
                return true;
            });

            leaderboard.sort((a, b) => {
                if (metric === 'bestTime') {
                    const timeA = a.bestTimes[difficulty] ?? Number.MAX_VALUE;
                    const timeB = b.bestTimes[difficulty] ?? Number.MAX_VALUE;
                    return timeA - timeB;
                } else if (metric === 'winRate') {
                    const rateA = a.winRates?.[difficulty] ?? 0;
                    const rateB = b.winRates?.[difficulty] ?? 0;
                    return rateB - rateA;
                } else { // wins
                    const winsA = a.completedCounts?.[difficulty] ?? 0;
                    const winsB = b.completedCounts?.[difficulty] ?? 0;
                    return winsB - winsA;
                }
            });

            // Apply limit after sorting
            leaderboard = leaderboard.slice(0, limitCount);
        }

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

        const dates = snapshot.docs.map((d: any) => {
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

export const ensureDailyStats = async (userId: string, currentStreak: number) => {
    const db = getFirestore();
    const userStatsRef = doc(db, USER_STATS_COLLECTION, userId);

    try {
        await runTransaction(db, async (transaction) => {
            const userStatsDoc = await transaction.get(userStatsRef);
            if (!userStatsDoc.exists()) return;

            const stats = userStatsDoc.data() as UserStats;
            let changed = false;

            if (stats.dailyCurrentWinStreak !== currentStreak) {
                stats.dailyCurrentWinStreak = currentStreak;
                changed = true;
            }

            if (stats.dailyBestWinStreak < currentStreak) {
                stats.dailyBestWinStreak = currentStreak;
                changed = true;
            }

            if (changed) {
                transaction.update(userStatsRef, {
                    dailyCurrentWinStreak: stats.dailyCurrentWinStreak,
                    dailyBestWinStreak: stats.dailyBestWinStreak
                });
            }
        });
    } catch (error) {
        console.error('StatsRepository: Failed to ensure daily stats', error);
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
        const affectedWeeklyKeys = new Set<string>();

        snapshot.forEach((doc) => {
            const data = doc.data() as any;
            if (data.durationSeconds === 0) {
                batch.delete(doc.ref);
                deletedCount++;
                if (data.dailyKey) affectedDailyKeys.add(data.dailyKey);
                if (data.weeklyKey) affectedWeeklyKeys.add(data.weeklyKey);
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
        const validWeeklyKeys = new Set<string>();
        validGames.forEach((g: any) => {
            if (g.dailyKey) validDailyKeys.add(g.dailyKey);
            if (g.weeklyKey) validWeeklyKeys.add(g.weeklyKey);
        });

        const allDailyKeys = new Set<string>([...affectedDailyKeys, ...validDailyKeys]);
        const allWeeklyKeys = new Set<string>([...affectedWeeklyKeys, ...validWeeklyKeys]);

        const dailyUpdates: Promise<void>[] = [];

        for (const dailyKey of allDailyKeys) {
            // Filter games for this day
            const dailyGames = validGames.filter((g: any) => g.dailyKey === dailyKey);

            const dailyStatsRef = doc(db, LEADERBOARD_DAILY_COLLECTION, `${dailyKey}_${userId}`);
            const dailyChallengeRef = doc(db, DAILY_CHALLENGE_LEADERBOARD_COLLECTION, `${dailyKey}_${userId}`);

            if (dailyGames.length === 0) {
                // No valid games left for this day -> Delete stats
                dailyUpdates.push(runTransaction(db, async (t) => {
                    t.delete(dailyStatsRef);
                    t.delete(dailyChallengeRef);
                }));
                continue;
            }

            // Rebuild Daily Stats
            let newDailyStats = JSON.parse(JSON.stringify(DEFAULT_STATS));
            newDailyStats.userId = userId;
            newDailyStats.displayName = currentNickname;
            newDailyStats.periodKey = dailyKey;

            let bestDailyChallengeTime: number | null = null;
            let bestDailyChallengeMistakes: number = 0;

            for (const game of dailyGames) {
                const isDaily = (game as any).isDailyChallenge === true;
                newDailyStats = updateStatsObject(newDailyStats, game, currentNickname, isDaily);

                if (isDaily && game.result === 'win') {
                    if (bestDailyChallengeTime === null || game.durationSeconds < bestDailyChallengeTime) {
                        bestDailyChallengeTime = game.durationSeconds;
                        bestDailyChallengeMistakes = game.mistakes;
                    }
                }
            }

            // Update Daily Leaderboard Doc
            dailyUpdates.push(runTransaction(db, async (t) => {
                t.set(dailyStatsRef, newDailyStats);
            }));

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

        // 4. Rebuild Affected Weekly Stats
        const weeklyUpdates: Promise<void>[] = [];
        for (const weeklyKey of allWeeklyKeys) {
            const weeklyGames = validGames.filter((g: any) => g.weeklyKey === weeklyKey);
            const weeklyStatsRef = doc(db, LEADERBOARD_WEEKLY_COLLECTION, `${weeklyKey}_${userId}`);

            if (weeklyGames.length === 0) {
                weeklyUpdates.push(runTransaction(db, async (t) => {
                    t.delete(weeklyStatsRef);
                }));
                continue;
            }

            let newWeeklyStats = JSON.parse(JSON.stringify(DEFAULT_STATS));
            newWeeklyStats.userId = userId;
            newWeeklyStats.displayName = currentNickname;
            newWeeklyStats.periodKey = weeklyKey;

            for (const game of weeklyGames) {
                const isDaily = (game as any).isDailyChallenge === true;
                newWeeklyStats = updateStatsObject(newWeeklyStats, game, currentNickname, isDaily);
            }

            weeklyUpdates.push(runTransaction(db, async (t) => {
                t.set(weeklyStatsRef, newWeeklyStats);
            }));
        }

        // Execute all updates
        await Promise.all([
            runTransaction(db, async (t) => { t.set(userStatsRef, newAllTimeStats); }),
            ...dailyUpdates,
            ...weeklyUpdates
        ]);

        console.log('StatsRepository: Cleanup complete. Stats updated.');
        return deletedCount;
    } catch (error: any) {
        console.error('StatsRepository: Cleanup failed', error);
        throw error;
    }
};
