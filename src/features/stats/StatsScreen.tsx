import React, { useMemo, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { TEXTS } from '../../config/texts';
import { ADMOB_IDS, BANNER_RESERVED_SPACE } from '../../config/admob';

type StatsScreenProps = {
  onGoBack: () => void;
};

const StatsScreen: React.FC<StatsScreenProps> = ({ onGoBack }) => {
  const [activeTab, setActiveTab] = useState<'week' | 'month' | 'allTime'>('allTime');

  const summaryCards = useMemo(
    () => [
      { label: TEXTS.stats.summary.gamesPlayed, value: '158' },
      { label: TEXTS.stats.summary.winRate, value: '82%' },
      { label: TEXTS.stats.summary.winStreak, value: '12' },
      { label: TEXTS.stats.summary.avgTime, value: '04:32' },
    ],
    [],
  );

  const bestTimes = useMemo(
    () => [
      { label: TEXTS.stats.bestTimes.easy, value: '02:15' },
      { label: TEXTS.stats.bestTimes.medium, value: '05:48' },
      { label: TEXTS.stats.bestTimes.hard, value: '11:03' },
    ],
    [],
  );
  const bannerUnitId =
    Platform.select({
      android: ADMOB_IDS.android.banner,
      ios: ADMOB_IDS.ios.banner,
    }) ?? ADMOB_IDS.android.banner;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onGoBack} activeOpacity={0.8}>
          <Text style={styles.backIcon}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{TEXTS.stats.title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabsRow}>
        {(['week', 'month', 'allTime'] as const).map(tabKey => (
          <TouchableOpacity
            key={tabKey}
            style={[styles.tabButton, activeTab === tabKey && styles.tabButtonActive]}
            onPress={() => setActiveTab(tabKey)}
            activeOpacity={0.9}
          >
            <Text style={[styles.tabLabel, activeTab === tabKey && styles.tabLabelActive]}>
              {TEXTS.stats.tabs[tabKey]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryGrid}>
          {summaryCards.map(card => (
            <View key={card.label} style={styles.summaryCard}>
              <Text style={styles.cardLabel}>{card.label}</Text>
              <Text style={styles.cardValue}>{card.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{TEXTS.stats.ratio.title}</Text>
          <View style={styles.ratioContent}>
            <View style={styles.ringWrapper}>
              <View style={styles.ringOuter}>
                <View style={styles.ringInner}>
                  <Text style={styles.ringValue}>130</Text>
                  <Text style={styles.ringLabel}>{TEXTS.stats.ratio.winsLabel}</Text>
                </View>
              </View>
            </View>
            <View style={styles.legend}>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, styles.legendDotWin]} />
                <Text style={styles.legendLabel}>
                  {TEXTS.stats.ratio.winsLabel}: 130
                </Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, styles.legendDotLoss]} />
                <Text style={styles.legendLabel}>
                  {TEXTS.stats.ratio.lossesLabel}: 28
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{TEXTS.stats.completed.title}</Text>
          <Text style={styles.sectionSubtitle}>{TEXTS.stats.completed.subtitle}</Text>
          <View style={styles.completedRow}>
            <Text style={styles.completedValue}>130</Text>
          </View>
          <View style={styles.difficultyRow}>
            <View style={styles.difficultyCol}>
              <Text style={styles.difficultyLabel}>Easy</Text>
              <Text style={styles.difficultyValue}>45</Text>
            </View>
            <View style={styles.difficultyCol}>
              <Text style={styles.difficultyLabel}>Medium</Text>
              <Text style={styles.difficultyValue}>52</Text>
            </View>
            <View style={styles.difficultyCol}>
              <Text style={styles.difficultyLabel}>Hard</Text>
              <Text style={styles.difficultyValue}>24</Text>
            </View>
            <View style={styles.difficultyCol}>
              <Text style={styles.difficultyLabel}>Expert</Text>
              <Text style={styles.difficultyValue}>9</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{TEXTS.stats.bestTimes.title}</Text>
          {bestTimes.map(row => (
            <View key={row.label} style={styles.bestTimeRow}>
              <Text style={styles.bestTimeLabel}>{row.label}</Text>
              <Text style={styles.bestTimeValue}>{row.value}</Text>
            </View>
          ))}
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
    backgroundColor: '#fff6ea',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffe8d2',
  },
  backIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5c4b33',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: '#3a2f1e',
  },
  headerSpacer: {
    width: 32,
  },
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginTop: 8,
    backgroundColor: '#fbead6',
    borderRadius: 999,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#c28d59',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabLabel: {
    fontSize: 14,
    color: '#9c8d7a',
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#5a4426',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: BANNER_RESERVED_SPACE,
    gap: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: '#fffdf9',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#d0a67b',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardLabel: {
    fontSize: 13,
    color: '#9e9384',
    marginBottom: 6,
  },
  cardValue: {
    fontSize: 24,
    color: '#2f2010',
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: '#fffdf9',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#d0a67b',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3d2a17',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#b5a89a',
    marginBottom: 12,
  },
  ratioContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ringWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringOuter: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 12,
    borderColor: '#ffd0d9',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  ringInner: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#fffdf9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    fontSize: 26,
    fontWeight: '700',
    color: '#402418',
  },
  ringLabel: {
    fontSize: 14,
    color: '#c18ea5',
    marginTop: 2,
  },
  legend: {
    gap: 10,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendDotWin: {
    backgroundColor: '#f7a2c2',
  },
  legendDotLoss: {
    backgroundColor: '#d6d6de',
  },
  legendLabel: {
    fontSize: 14,
    color: '#4f3e30',
  },
  completedRow: {
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  completedValue: {
    fontSize: 34,
    fontWeight: '700',
    color: '#2f2010',
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
  bestTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0e1d4',
    paddingVertical: 12,
  },
  bestTimeLabel: {
    fontSize: 15,
    color: '#5c4b3a',
  },
  bestTimeValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2f2010',
  },
  bannerArea: {
    height: BANNER_RESERVED_SPACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
