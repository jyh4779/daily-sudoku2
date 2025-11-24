import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Platform, BackHandler, Alert } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useTexts } from '../../config/texts';
import { ADMOB_IDS, BANNER_RESERVED_SPACE } from '../../config/admob';

type HomeScreenProps = {
  onPressNewGame?: () => void;
  onPressContinue?: () => void;
  onPressStats?: () => void;
  onPressSettings?: () => void;
  continueAvailable?: boolean;
};

const noop = () => { };

const HomeScreen: React.FC<HomeScreenProps> = ({
  onPressNewGame,
  onPressContinue,
  onPressStats,
  onPressSettings,
  continueAvailable = false,
}) => {
  const texts = useTexts();
  const { width } = useWindowDimensions();
  const horizontalPadding = 24;
  const availableWidth = width - horizontalPadding * 2;
  const buttonWidth = Math.min(Math.max(availableWidth, 200), 320);
  const accentWidth = Math.min(availableWidth * 0.82, 260);
  const accentSidePadding = horizontalPadding + (availableWidth - accentWidth) / 2;

  React.useEffect(() => {
    const backAction = () => {
      Alert.alert(texts.appName, 'Are you sure you want to exit?', [
        {
          text: texts.common.cancel,
          onPress: () => null,
          style: 'cancel',
        },
        { text: texts.common.confirm, onPress: () => BackHandler.exitApp() },
      ]);
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [texts]);

  const buttons = [
    { label: texts.home.newGame, icon: '+', color: '#f4b2cf', onPress: onPressNewGame, disabled: false },
    { label: texts.home.continue, icon: '▶', color: '#b8e6ff', onPress: onPressContinue, disabled: !continueAvailable },
    { label: texts.home.stats, icon: '≣', color: '#d7cdfd', onPress: onPressStats, disabled: false },
    { label: texts.home.settings, icon: '⚙', color: '#ffd8ad', onPress: onPressSettings, disabled: false },
  ];
  const bannerUnitId =
    Platform.select({
      android: ADMOB_IDS.android.banner,
      ios: ADMOB_IDS.ios.banner,
    }) ?? ADMOB_IDS.android.banner;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.background}>
        <View pointerEvents="none" style={[styles.highlightPanel, { left: accentSidePadding, right: accentSidePadding }]} />

        <View style={styles.content}>
          <View style={styles.topSection}>
            <Text style={styles.title}>{texts.appName}</Text>
          </View>

          <View style={styles.centerSection}>
            <View style={styles.menuList}>
              {buttons.map(btn => (
                <View key={btn.label} style={styles.menuRow}>
                  <TouchableOpacity
                    style={[
                      styles.menuButton,
                      { width: buttonWidth, backgroundColor: btn.color },
                      btn.disabled && styles.menuButtonDisabled,
                    ]}
                    activeOpacity={0.85}
                    onPress={btn.disabled ? noop : btn.onPress ?? noop}
                  >
                    <View style={styles.menuButtonContent}>
                      <Text style={styles.menuIcon}>{btn.icon}</Text>
                      <Text style={styles.menuLabel}>{btn.label}</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.bottomSection} />
        </View>
      </View>
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

export default HomeScreen;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fbfc' },
  background: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  highlightPanel: {
    position: 'absolute',
    top: 28,
    bottom: 28,
    backgroundColor: '#e9f3fb',
    borderRadius: 36,
  },
  content: {
    flex: 1,
    width: '100%',
    paddingBottom: BANNER_RESERVED_SPACE,
  },
  topSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSection: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1f1f25',
  },
  menuList: {
    width: '100%',
    gap: 16,
  },
  menuRow: {
    alignItems: 'center',
  },
  menuButton: {
    borderRadius: 999,
    paddingVertical: 16,
    shadowColor: '#19263d',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  menuButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222327',
    marginRight: 10,
  },
  menuButtonDisabled: {
    opacity: 0.35,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222327',
  },
  bannerArea: {
    height: BANNER_RESERVED_SPACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
