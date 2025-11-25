import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, BackHandler } from 'react-native';
import { subscribeToUserStats, UserStats } from './data/StatsRepository';
import { getCurrentUser } from '../../core/auth/AuthRepository';
import { useTexts } from '../../config/texts';
import { BANNER_RESERVED_SPACE, ADMOB_IDS } from '../../config/admob';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';

type StatsScreenProps = {
  onGoBack: () => void;
};

const StatsScreen: React.FC<StatsScreenProps> = ({ onGoBack }) => {
  const texts = useTexts();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'week' | 'month' | 'all'>('all');

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5b7df6" />
      </View>
    );
  }

  // Helper to format time
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const currentStats = stats || {
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

  const bannerUnitId =
    Platform.select({
      android: ADMOB_IDS.android.banner,
      ios: ADMOB_IDS.ios.banner,
    }) ?? ADMOB_IDS.android.banner;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
          <Text style={styles.backIcon}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{texts.stats.title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'week' && styles.tabActive]} onPress={() => setTab('week')}>
          <Text style={[styles.tabText, tab === 'week' && styles.tabTextActive]}>{texts.stats.tabs.week}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'month' && styles.tabActive]} onPress={() => setTab('month')}>
          <Text style={[styles.tabText, tab === 'month' && styles.tabTextActive]}>{texts.stats.tabs.month}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'all' && styles.tabActive]} onPress={() => setTab('all')}>
          <Text style={[styles.tabText, tab === 'all' && styles.tabTextActive]}>{texts.stats.tabs.allTime}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
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
            <View style={styles.difficultyCol}>
              <Text style={styles.difficultyLabel}>Beginner</Text>
              <Text style={styles.difficultyValue}>{currentStats.completedCounts?.beginner ?? 0}</Text>
            </View>
            <View style={styles.difficultyCol}>
              <Text style={styles.difficultyLabel}>Easy</Text>
              <Text style={styles.difficultyValue}>{currentStats.completedCounts?.easy ?? 0}</Text>
            </View>
            <View style={styles.difficultyCol}>
              <Text style={styles.difficultyLabel}>Medium</Text>
              <Text style={styles.difficultyValue}>{currentStats.completedCounts?.medium ?? 0}</Text>
            </View>
            <View style={styles.difficultyCol}>
              <Text style={styles.difficultyLabel}>Hard</Text>
              <Text style={styles.difficultyValue}>{currentStats.completedCounts?.hard ?? 0}</Text>
            </View>
            <View style={styles.difficultyCol}>
              <Text style={styles.difficultyLabel}>Expert</Text>
              <Text style={styles.difficultyValue}>{currentStats.completedCounts?.expert ?? 0}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{texts.stats.bestTimes.title}</Text>
          <View style={styles.bestTimeRow}>
            <Text style={styles.bestTimeLabel}>{texts.stats.bestTimes.beginner}</Text>
            <Text style={styles.bestTimeValue}>{currentStats.bestTimes.beginner ? formatTime(currentStats.bestTimes.beginner) : '-'}</Text>
          </View>
          <View style={styles.bestTimeRow}>
            <Text style={styles.bestTimeLabel}>{texts.stats.bestTimes.easy}</Text>
            <Text style={styles.bestTimeValue}>{currentStats.bestTimes.easy ? formatTime(currentStats.bestTimes.easy) : '-'}</Text>
          </View>
          <View style={styles.bestTimeRow}>
            <Text style={styles.bestTimeLabel}>{texts.stats.bestTimes.medium}</Text>
            <Text style={styles.bestTimeValue}>{currentStats.bestTimes.medium ? formatTime(currentStats.bestTimes.medium) : '-'}</Text>
          </View>
          <View style={styles.bestTimeRow}>
            <Text style={styles.bestTimeLabel}>{texts.stats.bestTimes.hard}</Text>
            <Text style={styles.bestTimeValue}>{currentStats.bestTimes.hard ? formatTime(currentStats.bestTimes.hard) : '-'}</Text>
          </View>
          <View style={styles.bestTimeRow}>
            <Text style={styles.bestTimeLabel}>{texts.stats.bestTimes.expert}</Text>
            <Text style={styles.bestTimeValue}>{currentStats.bestTimes.expert ? formatTime(currentStats.bestTimes.expert) : '-'}</Text>
          </View>
        </View>
      </ScrollView>
      <View style={styles.bannerArea}>
        <BannerAd
          unitId={bannerUnitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        />
      </View>
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  backButton: {
    width: 32,
    height: 32,
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
    width: 32,
  },
  tabs: {
    flexDirection: 'row',
    padding: 4,
    marginHorizontal: 24,
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
    padding: 24,
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
  chartPlaceholder: {
    height: 120,
    backgroundColor: '#f5f7fa',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
  bannerArea: {
    height: BANNER_RESERVED_SPACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
