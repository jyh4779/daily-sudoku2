import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, BackHandler, FlatList, Modal, Alert } from 'react-native';
import { subscribeToUserStats, UserStats, Difficulty, getDifficultyPercentiles, DifficultyPercentiles, getDailyStreak, getStreakLeaderboard, resetGameRecords } from './data/StatsRepository';
import { getCurrentUser } from '../../core/auth/AuthRepository';
import { useTexts } from '../../config/texts';

type StatsScreenProps = {
  onGoBack: () => void;
};

const StatsScreen: React.FC<StatsScreenProps> = ({ onGoBack }) => {
  const texts = useTexts();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<Difficulty | 'daily'>('medium');
  const [percentiles, setPercentiles] = useState<DifficultyPercentiles | null>(null);
  const [percentileLoading, setPercentileLoading] = useState(false);

  // Daily Stats State
  const [dailyStreak, setDailyStreak] = useState(0);
  const [dailyLeaderboard, setDailyLeaderboard] = useState<any[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);

  // Reset Modal State
  const [isResetModalVisible, setIsResetModalVisible] = useState(false);
  const [selectedResetDifficulties, setSelectedResetDifficulties] = useState<Set<Difficulty>>(new Set());
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const backAction = () => {
      onGoBack();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [onGoBack]);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToUserStats(user.uid, (data) => {
      setStats(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchPercentiles = async () => {
      if (!stats || !stats.userId || selectedTab === 'daily') return;

      setPercentileLoading(true);
      try {
        const data = await getDifficultyPercentiles(stats.userId, selectedTab, stats);
        setPercentiles(data);
      } catch (error) {
        console.error('Failed to fetch percentiles', error);
      } finally {
        setPercentileLoading(false);
      }
    };

    fetchPercentiles();
  }, [stats, selectedTab]);

  useEffect(() => {
    const fetchDailyStats = async () => {
      if (selectedTab !== 'daily') return;

      setDailyLoading(true);
      try {
        const user = getCurrentUser();
        if (user) {
          const s = await getDailyStreak(user.uid);
          setDailyStreak(s);

          const lb = await getStreakLeaderboard(20);
          setDailyLeaderboard(lb);
        }
      } catch (e) {
        console.error('Failed to fetch daily stats', e);
      } finally {
        setDailyLoading(false);
      }
    };

    fetchDailyStats();
  }, [selectedTab]);

  // Helper to format time
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const renderPercentile = (value: number | undefined) => {
    if (value === undefined || value === null) return null;
    const p = Math.min(100, Math.max(1, Math.round(value)));
    return (
      <View style={styles.percentileBadge}>
        <Text style={styles.percentileText}>상위 {p}%</Text>
      </View>
    );
  };

  const currentStats = stats || {
    userId: '',
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    currentWinStreak: 0,
    bestWinStreak: 0,
    averageTimeSeconds: 0,
    bestTimes: {
      beginner: null,
      easy: null,
      medium: null,
      hard: null,
      expert: null,
    },
    completedCounts: { beginner: 0, easy: 0, medium: 0, hard: 0, expert: 0 },
    gamesPlayedCounts: { beginner: 0, easy: 0, medium: 0, hard: 0, expert: 0 },
    winRates: { beginner: 0, easy: 0, medium: 0, hard: 0, expert: 0 },
    difficultyStreaks: {
      beginner: { current: 0, best: 0 },
      easy: { current: 0, best: 0 },
      medium: { current: 0, best: 0 },
      hard: { current: 0, best: 0 },
      expert: { current: 0, best: 0 },
    },
    averageTimes: { beginner: 0, easy: 0, medium: 0, hard: 0, expert: 0 },
    totalTimeSeconds: 0,
  };

  const toggleResetDifficulty = (diff: Difficulty) => {
    const newSet = new Set(selectedResetDifficulties);
    if (newSet.has(diff)) {
      newSet.delete(diff);
    } else {
      newSet.add(diff);
    }
    setSelectedResetDifficulties(newSet);
  };

  const toggleSelectAll = () => {
    const allDiffs: Difficulty[] = ['beginner', 'easy', 'medium', 'hard', 'expert'];
    if (selectedResetDifficulties.size === allDiffs.length) {
      setSelectedResetDifficulties(new Set());
    } else {
      setSelectedResetDifficulties(new Set(allDiffs));
    }
  };

  const handleReset = async () => {
    if (selectedResetDifficulties.size === 0) return;

    Alert.alert(
      texts.stats.reset.warningTitle,
      texts.stats.reset.warningMessage,
      [
        { text: texts.common.cancel, style: 'cancel' },
        {
          text: texts.common.confirm,
          style: 'destructive',
          onPress: async () => {
            setIsResetting(true);
            try {
              const user = getCurrentUser();
              if (user) {
                await resetGameRecords(user.uid, Array.from(selectedResetDifficulties));
                Alert.alert(texts.settings.success, texts.stats.reset.success);
                setIsResetModalVisible(false);
                setSelectedResetDifficulties(new Set());
              }
            } catch (error) {
              console.error('Reset failed', error);
              Alert.alert(texts.settings.error, 'Failed to reset records.');
            } finally {
              setIsResetting(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5b7df6" />
      </View>
    );
  }

  const tabs: (Difficulty | 'daily')[] = ['beginner', 'easy', 'medium', 'hard', 'expert', 'daily'];
  const resetDiffs: Difficulty[] = ['beginner', 'easy', 'medium', 'hard', 'expert'];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
          <Text style={styles.backIcon}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{texts.common.records}</Text>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={() => setIsResetModalVisible(true)}
        >
          <Text style={styles.resetButtonText}>↺</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, selectedTab === tab && styles.tabActive]}
              onPress={() => setSelectedTab(tab)}
            >
              <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
                {/* @ts-ignore: texts.game.difficulty might not have 'daily' typed yet */}
                {texts.game.difficulty[tab]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {selectedTab === 'daily' ? (
          <>
            {/* Daily Streak */}
            <View style={styles.statRow}>
              <View style={styles.statLabelContainer}>
                <Text style={styles.statLabel}>{texts.stats.summary.winStreak}</Text>
              </View>
              <View style={styles.statValueContainer}>
                <Text style={styles.statValue}>🔥 {dailyStreak}일</Text>
              </View>
            </View>

            {/* Daily Leaderboard */}
            <View style={styles.leaderboardSection}>
              <Text style={styles.leaderboardTitle}>{texts.daily.rankTabs.streak}</Text>
              {dailyLoading ? (
                <ActivityIndicator color="#5b7df6" />
              ) : dailyLeaderboard.length === 0 ? (
                <Text style={styles.emptyText}>{texts.stats.rankings.noData}</Text>
              ) : (
                dailyLeaderboard.map((item, index) => (
                  <View key={`${item.userId}-${index}`} style={styles.rankItem}>
                    <View style={styles.rankIndex}>
                      <Text style={styles.rankIndexText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.rankName}>{item.displayName}</Text>
                    <Text style={styles.rankScore}>{item.dailyBestWinStreak}연승</Text>
                  </View>
                ))
              )}
            </View>
          </>
        ) : (
          <>
            {/* Total Games */}
            <View style={styles.statRow}>
              <View style={styles.statLabelContainer}>
                <Text style={styles.statLabel}>{texts.stats.summary.gamesPlayed}</Text>
              </View>
              <View style={styles.statValueContainer}>
                <Text style={styles.statValue}>
                  {currentStats.gamesPlayedCounts?.[selectedTab] || 0}
                </Text>
                {renderPercentile(percentiles?.gamesPlayed)}
              </View>
            </View>

            {/* Win Rate */}
            <View style={styles.statRow}>
              <View style={styles.statLabelContainer}>
                <Text style={styles.statLabel}>{texts.stats.summary.winRate}</Text>
              </View>
              <View style={styles.statValueContainer}>
                <Text style={styles.statValue}>
                  {Math.round((currentStats.winRates?.[selectedTab] || 0) * 100)}%
                </Text>
                {renderPercentile(percentiles?.winRate)}
              </View>
            </View>

            {/* Best Streak */}
            <View style={styles.statRow}>
              <View style={styles.statLabelContainer}>
                <Text style={styles.statLabel}>{texts.stats.summary.winStreak}</Text>
              </View>
              <View style={styles.statValueContainer}>
                <Text style={styles.statValue}>
                  {currentStats.difficultyStreaks?.[selectedTab]?.best || 0}
                </Text>
                {renderPercentile(percentiles?.bestWinStreak)}
              </View>
            </View>

            {/* Average Time */}
            <View style={styles.statRow}>
              <View style={styles.statLabelContainer}>
                <Text style={styles.statLabel}>{texts.stats.summary.avgTime}</Text>
              </View>
              <View style={styles.statValueContainer}>
                <Text style={styles.statValue}>
                  {formatTime(Math.round(currentStats.averageTimes?.[selectedTab] || 0))}
                </Text>
                {renderPercentile(percentiles?.averageTime)}
              </View>
            </View>

            {/* Best Time */}
            <View style={styles.statRow}>
              <View style={styles.statLabelContainer}>
                <Text style={styles.statLabel}>{texts.stats.bestTimes.title}</Text>
              </View>
              <View style={styles.statValueContainer}>
                <Text style={styles.statValue}>
                  {(currentStats.bestTimes?.[selectedTab] !== null && currentStats.bestTimes?.[selectedTab] !== undefined)
                    ? formatTime(currentStats.bestTimes[selectedTab]!)
                    : '-'}
                </Text>
                {renderPercentile(percentiles?.bestTime)}
              </View>
            </View>

            {percentileLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="small" color="#5b7df6" />
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Reset Modal */}
      <Modal
        visible={isResetModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsResetModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{texts.stats.reset.title}</Text>

            <TouchableOpacity style={styles.selectAllBtn} onPress={toggleSelectAll}>
              <Text style={styles.selectAllText}>{texts.stats.reset.selectAll}</Text>
            </TouchableOpacity>

            <ScrollView style={styles.diffList}>
              {resetDiffs.map(diff => (
                <TouchableOpacity
                  key={diff}
                  style={styles.diffItem}
                  onPress={() => toggleResetDifficulty(diff)}
                >
                  <View style={[styles.checkbox, selectedResetDifficulties.has(diff) && styles.checkboxSelected]}>
                    {selectedResetDifficulties.has(diff) && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.diffText}>{texts.game.difficulty[diff]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setIsResetModalVisible(false)}
                disabled={isResetting}
              >
                <Text style={styles.modalBtnText}>{texts.common.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.confirmBtn, selectedResetDifficulties.size === 0 && styles.disabledBtn]}
                onPress={handleReset}
                disabled={isResetting || selectedResetDifficulties.size === 0}
              >
                {isResetting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[styles.modalBtnText, styles.confirmBtnText]}>{texts.stats.reset.button}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default StatsScreen;

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
    paddingTop: 50,
    paddingBottom: 12,
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
  resetButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    fontSize: 24,
    color: '#5b7df6',
    fontWeight: 'bold',
  },
  tabsContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f5',
  },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f2f5',
  },
  tabActive: {
    backgroundColor: '#5b7df6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8f96a8',
  },
  tabTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  statLabelContainer: {
    flex: 1,
  },
  statLabel: {
    fontSize: 15,
    color: '#555',
    fontWeight: '600',
  },
  statValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2f3b59',
  },
  percentileBadge: {
    backgroundColor: '#eef4ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  percentileText: {
    fontSize: 12,
    color: '#5b7df6',
    fontWeight: '600',
  },
  loadingOverlay: {
    marginTop: 20,
    alignItems: 'center',
  },
  leaderboardSection: {
    marginTop: 24,
  },
  leaderboardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
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
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  selectAllBtn: {
    alignSelf: 'flex-end',
    marginBottom: 12,
    padding: 4,
  },
  selectAllText: {
    color: '#5b7df6',
    fontWeight: '600',
    fontSize: 14,
  },
  diffList: {
    marginBottom: 24,
  },
  diffItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ddd',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#5b7df6',
    borderColor: '#5b7df6',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  diffText: {
    fontSize: 16,
    color: '#333',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#f0f2f5',
  },
  confirmBtn: {
    backgroundColor: '#ff6b6b',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  modalBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmBtnText: {
    color: '#fff',
  },
});
