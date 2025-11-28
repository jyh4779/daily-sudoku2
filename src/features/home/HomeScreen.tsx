import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Platform, BackHandler, Alert } from 'react-native';
import { useTexts } from '../../config/texts';
import { ADMOB_IDS } from '../../config/admob';

type HomeScreenProps = {
  onPressNewGame?: (difficulty: string) => void;
  onPressContinue?: () => void;
  onPressStats?: () => void;
  onPressSettings?: () => void;
  onPressDaily?: () => void;
  continueAvailable?: boolean;
};

const noop = () => { };

const HomeScreen: React.FC<HomeScreenProps> = ({
  onPressNewGame,
  onPressContinue,
  onPressStats,
  onPressSettings,
  onPressDaily,
  continueAvailable = false,
}) => {
  const texts = useTexts();
  const [showDifficultyModal, setShowDifficultyModal] = React.useState(false);
  const { width } = useWindowDimensions();
  const horizontalPadding = 24;
  const availableWidth = width - horizontalPadding * 2;
  const buttonWidth = Math.min(Math.max(availableWidth, 200), 320);
  const accentWidth = Math.min(availableWidth * 0.82, 260);
  const accentSidePadding = horizontalPadding + (availableWidth - accentWidth) / 2;

  React.useEffect(() => {
    const backAction = () => {
      if (showDifficultyModal) {
        setShowDifficultyModal(false);
        return true;
      }

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
  }, [texts, showDifficultyModal]);

  const buttons = [
    { label: texts.home.newGame, icon: '+', color: '#f4b2cf', onPress: () => setShowDifficultyModal(true), disabled: false },
    { label: 'Daily Challenge', icon: '🔥', color: '#ff6b6b', onPress: onPressDaily, disabled: false },
    { label: texts.home.continue, icon: '▶', color: '#b8e6ff', onPress: onPressContinue, disabled: !continueAvailable },
    { label: texts.home.settings, icon: '⚙', color: '#ffd8ad', onPress: onPressSettings, disabled: false },
  ];

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

      {showDifficultyModal && (
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDifficultyModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalContent}
            onPress={e => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>{texts.home.newGame}</Text>
            <View style={styles.difficultyList}>
              {(['beginner', 'easy', 'medium', 'hard', 'expert'] as const).map(diff => (
                <TouchableOpacity
                  key={diff}
                  style={styles.difficultyButton}
                  onPress={() => {
                    setShowDifficultyModal(false);
                    onPressNewGame?.(diff);
                  }}
                >
                  <Text style={styles.difficultyButtonText}>{texts.game.difficulty[diff]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fbfc', paddingBottom: 140 },
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
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    elevation: 20,
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  difficultyList: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  difficultyButton: {
    width: '100%',
    paddingVertical: 14,
    backgroundColor: '#f0f4f8',
    borderRadius: 12,
    alignItems: 'center',
  },
  difficultyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
  },
});
