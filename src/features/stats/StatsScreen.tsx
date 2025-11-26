import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, BackHandler, FlatList } from 'react-native';
import { subscribeToUserStats, UserStats, getLeaderboard, Difficulty, LeaderboardMetric } from './data/StatsRepository';
import { getCurrentUser } from '../../core/auth/AuthRepository';
import { useTexts } from '../../config/texts';

type StatsScreenProps = {
  onGoBack: () => void;
};

const StatsScreen: React.FC<StatsScreenProps> = ({ onGoBack }) => {
  const texts = useTexts();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'statistics' | 'rankings'>('statistics');

  // Rankings State
  const [rankingDifficulty, setRankingDifficulty] = useState<Difficulty>('medium');
  const [rankingMetric, setRankingMetric] = useState<LeaderboardMetric>('bestTime');
  const [leaderboard, setLeaderboard] = useState<UserStats[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);

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

  const fetchLeaderboard = useCallback(async () => {
    setRankingLoading(true);
    const data = await getLeaderboard(rankingMetric, rankingDifficulty);
    setLeaderboard(data);
    setRankingLoading(false);
  }, [rankingMetric, rankingDifficulty]);

  useEffect(() => {
    if (tab === 'rankings') {
      void fetchLeaderboard();
    }
  }, [tab, fetchLeaderboard]);

  // Helper to format time
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
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
    totalTimeSeconds: 0,
  };

  const renderStatistics = () => (
    <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
      <View style={styles.summaryGrid}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>{texts.stats.summary.gamesPlayed}</Text>
          <Text style={styles.summaryValue}>{currentStats.gamesPlayed}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>{texts.stats.summary.winRate}</Text>
          <Text style={styles.summaryValue}>{Math.round(currentStats.winRate * 100)}%</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>{texts.stats.summary.winStreak}</Text>
          <Text style={styles.summaryValue}>{currentStats.currentWinStreak}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>{texts.stats.summary.avgTime}</Text>
          <Text style={styles.summaryValue}>{formatTime(Math.round(currentStats.averageTimeSeconds))}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{texts.stats.completed.title}</Text>
          <Text style={styles.sectionSubtitle}>{texts.stats.completed.subtitle}</Text>
        </View>
        <View style={styles.difficultyRow}>
          {(['beginner', 'easy', 'medium', 'hard', 'expert'] as Difficulty[]).map((diff) => (
            <View key={diff} style={styles.difficultyCol}>
              <Text style={styles.difficultyLabel}>{texts.game.difficulty[diff]}</Text>
              <Text style={styles.difficultyValue}>{currentStats.completedCounts[diff]}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{texts.stats.bestTimes.title}</Text>
        {(['beginner', 'easy', 'medium', 'hard', 'expert'] as Difficulty[]).map((diff) => (
          <View key={diff} style={styles.bestTimeRow}>
            <Text style={styles.bestTimeLabel}>{texts.game.difficulty[diff]}</Text>
            <Text style={styles.bestTimeValue}>
              {currentStats.bestTimes[diff] ? formatTime(currentStats.bestTimes[diff]!) : '-'}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderRankings = () => (
    <View style={styles.content}>
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {(['beginner', 'easy', 'medium', 'hard', 'expert'] as Difficulty[]).map((diff) => (
            <TouchableOpacity
              key={diff}
              style={[styles.filterChip, rankingDifficulty === diff && styles.filterChipActive]}
              onPress={() => setRankingDifficulty(diff)}
            >
              <Text style={[styles.filterText, rankingDifficulty === diff && styles.filterTextActive]}>
                {texts.game.difficulty[diff]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.metricRow}>
          {(['bestTime', 'winRate', 'wins'] as LeaderboardMetric[]).map((metric) => (
            <TouchableOpacity
              key={metric}
              style={[styles.metricChip, rankingMetric === metric && styles.metricChipActive]}
              onPress={() => setRankingMetric(metric)}
            >
              <Text style={[styles.metricText, rankingMetric === metric && styles.metricTextActive]}>
                {texts.stats.rankings.metric[metric]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {rankingLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5b7df6" />
        </View>
      ) : leaderboard.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{texts.stats.rankings.noData}</Text>
        </View>
      ) : (
        <FlatList
          data={leaderboard}
          keyExtractor={(item, index) => `${item.userId}-${index}`}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => (
            <View style={styles.rankItem}>
              <View style={styles.rankIndex}>
                <Text style={styles.rankIndexText}>{index + 1}</Text>
              </View>
              <View style={styles.rankInfo}>
                <Text style={styles.rankName}>{item.displayName || `User ${item.userId.slice(0, 4)}`}</Text>
              </View>
              <View style={styles.rankScore}>
                <Text style={styles.rankScoreText}>
                  {rankingMetric === 'bestTime'
                    ? item.bestTimes[rankingDifficulty] ? formatTime(item.bestTimes[rankingDifficulty]!) : '-'
                    : rankingMetric === 'winRate'
                      ? `${Math.round(item.winRate * 100)}%`
                      : item.wins}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5b7df6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
          <Text style={styles.backIcon}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{texts.stats.title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'statistics' && styles.tabActive]}
          onPress={() => setTab('statistics')}
        >
          <Text style={[styles.tabText, tab === 'statistics' && styles.tabTextActive]}>
            {texts.stats.tabs.statistics}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'rankings' && styles.tabActive]}
          onPress={() => setTab('rankings')}
        >
          <Text style={[styles.tabText, tab === 'rankings' && styles.tabTextActive]}>
            {texts.stats.tabs.rankings}
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'statistics' ? renderStatistics() : renderRankings()}
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
  tabs: {
    flexDirection: 'row',
    padding: 4,
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#eef1f6',
    borderRadius: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9aa0b8',
  },
  tabTextActive: {
    color: '#5b7df6',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  summaryItem: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#8f96a8',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 20,
    color: '#2f3b59',
    fontWeight: '700',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2f3b59',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#8f96a8',
  },
  bestTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f5',
  },
  bestTimeLabel: {
    fontSize: 15,
    color: '#555',
  },
  bestTimeValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  difficultyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  difficultyCol: {
    flex: 1,
    alignItems: 'center',
  },
  difficultyLabel: {
    fontSize: 12,
    color: '#a9998b',
  },
  difficultyValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34271b',
    marginTop: 2,
  },
  // Rankings Styles
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f5',
  },
  filterScroll: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f2f5',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#5b7df6',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8f96a8',
  },
  filterTextActive: {
    color: '#fff',
  },
  metricRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  metricChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#f8f9fd',
    borderWidth: 1,
    borderColor: '#eef1f6',
  },
  metricChipActive: {
    backgroundColor: '#eef4ff',
    borderColor: '#5b7df6',
  },
  metricText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8f96a8',
  },
  metricTextActive: {
    color: '#5b7df6',
  },
  listContent: {
    padding: 16,
    paddingBottom: 120,
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  rankIndex: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f2f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankIndexText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5b7df6',
  },
  rankInfo: {
    flex: 1,
  },
  rankName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2f3b59',
  },
  rankScore: {
    minWidth: 80,
    alignItems: 'flex-end',
  },
  rankScoreText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2f3b59',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 15,
    color: '#8f96a8',
    textAlign: 'center',
  },
});
