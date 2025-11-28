import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { getDailyStreak, getDailyChallengeLeaderboard, getStreakLeaderboard, ensureDailyStats } from '../stats/data/StatsRepository';
import { getCurrentUser } from '../../core/auth/AuthRepository';
import { useTexts } from '../../config/texts';

type DailySudokuScreenProps = {
    onPlay: () => void;
};

const DailySudokuScreen: React.FC<DailySudokuScreenProps> = ({ onPlay }) => {
    const texts = useTexts();
    const [streak, setStreak] = useState(0);
    const [loading, setLoading] = useState(true);
    const [dailyLeaderboard, setDailyLeaderboard] = useState<any[]>([]);
    const [streakLeaderboard, setStreakLeaderboard] = useState<any[]>([]);
    const [todayCompleted, setTodayCompleted] = useState(false);
    const [activeTab, setActiveTab] = useState<'today' | 'streak'>('today');

    const today = new Date().toISOString().split('T')[0];

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const user = getCurrentUser();
            if (user) {
                const s = await getDailyStreak(user.uid);
                setStreak(s);

                // Sync daily stats for leaderboard
                await ensureDailyStats(user.uid, s);

                // Check if already completed today
                const lb = await getDailyChallengeLeaderboard(today, 100);
                const myEntry = lb.find((item: any) => item.userId === user.uid);
                if (myEntry) {
                    setTodayCompleted(true);
                }
                setDailyLeaderboard(lb.slice(0, 20)); // Top 20

                // Load Streak Leaderboard
                const slb = await getStreakLeaderboard(20);
                setStreakLeaderboard(slb);
            }
        } catch (e) {
            console.error('Failed to load daily data', e);
        } finally {
            setLoading(false);
        }
    }, [today]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleStartDaily = () => {
        onPlay();
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}m ${s}s`;
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#5b7df6" />
            </View>
        );
    }

    const currentLeaderboard = activeTab === 'today' ? dailyLeaderboard : streakLeaderboard;

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{texts.daily.title}</Text>
            </View>

            <View style={styles.content}>
                {/* Streak Section */}
                <View style={styles.streakContainer}>
                    <Text style={styles.streakLabel}>{texts.stats.summary.winStreak}</Text>
                    <Text style={styles.streakValue}>🔥 {streak} {texts.daily.subtitle.split(' ')[0] === '매일' ? '일' : 'Days'}</Text>
                </View>

                {/* Action Section */}
                <View style={styles.actionContainer}>
                    <Text style={styles.dateText}>{today}</Text>
                    {todayCompleted ? (
                        <View style={styles.completedBadge}>
                            <Text style={styles.completedText}>{texts.game.overlayTitle.success}</Text>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.playButton} onPress={handleStartDaily}>
                            <Text style={styles.playButtonText}>{texts.daily.playButton}</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Leaderboard Section */}
                <View style={styles.leaderboardContainer}>
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.tabButton, activeTab === 'today' && styles.tabButtonActive]}
                            onPress={() => setActiveTab('today')}
                        >
                            <Text style={[styles.tabText, activeTab === 'today' && styles.tabTextActive]}>
                                {texts.daily.rankTabs.today}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tabButton, activeTab === 'streak' && styles.tabButtonActive]}
                            onPress={() => setActiveTab('streak')}
                        >
                            <Text style={[styles.tabText, activeTab === 'streak' && styles.tabTextActive]}>
                                {texts.daily.rankTabs.streak}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {currentLeaderboard.length === 0 ? (
                        <Text style={styles.emptyText}>{texts.stats.rankings.noData}</Text>
                    ) : (
                        <FlatList
                            data={currentLeaderboard}
                            keyExtractor={(item, index) => `${item.userId}-${index}`}
                            renderItem={({ item, index }) => (
                                <View style={styles.rankItem}>
                                    <View style={styles.rankIndex}>
                                        <Text style={styles.rankIndexText}>{index + 1}</Text>
                                    </View>
                                    <Text style={styles.rankName}>{item.displayName}</Text>
                                    <Text style={styles.rankScore}>
                                        {activeTab === 'today'
                                            ? formatTime(item.durationSeconds)
                                            : `${item.dailyBestWinStreak ?? 0} ${texts.daily.subtitle.split(' ')[0] === '매일' ? '일' : 'Days'}`}
                                    </Text>
                                </View>
                            )}
                        />
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#f8f9fd',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backIcon: {
        fontSize: 24,
        color: '#333',
        fontWeight: 'bold',
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
    },
    headerSpacer: {
        width: 40,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    streakContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    streakLabel: {
        fontSize: 14,
        color: '#8f96a8',
        marginBottom: 8,
    },
    streakValue: {
        fontSize: 32,
        fontWeight: '800',
        color: '#ff6b6b',
    },
    actionContainer: {
        alignItems: 'center',
        marginBottom: 40,
        backgroundColor: '#fff',
        padding: 24,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    dateText: {
        fontSize: 16,
        color: '#555',
        marginBottom: 16,
        fontWeight: '600',
    },
    playButton: {
        backgroundColor: '#5b7df6',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 30,
        width: '100%',
        alignItems: 'center',
    },
    playButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    completedBadge: {
        backgroundColor: '#4cd964',
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 30,
    },
    completedText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    leaderboardContainer: {
        flex: 1,
    },
    leaderboardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#2f3b59',
        marginBottom: 16,
    },
    emptyText: {
        textAlign: 'center',
        color: '#8f96a8',
        marginTop: 20,
    },
    rankItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
    },
    rankIndex: {
        width: 30,
        alignItems: 'center',
        marginRight: 10,
    },
    rankIndexText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#5b7df6',
    },
    rankName: {
        flex: 1,
        fontSize: 15,
        color: '#333',
        fontWeight: '600',
    },
    rankScore: {
        fontSize: 15,
        color: '#555',
        fontWeight: '500',
    },
    tabContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        backgroundColor: '#eef2f8',
        borderRadius: 12,
        padding: 4,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 10,
    },
    tabButtonActive: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#8f96a8',
    },
    tabTextActive: {
        color: '#5b7df6',
        fontWeight: '700',
    },
});

export default DailySudokuScreen;
