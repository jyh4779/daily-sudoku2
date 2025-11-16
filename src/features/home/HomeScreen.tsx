import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { TEXTS } from '../../config/texts';

type HomeScreenProps = {
  onPressNewGame?: () => void;
  onPressContinue?: () => void;
  onPressStats?: () => void;
  onPressSettings?: () => void;
  continueAvailable?: boolean;
};

const noop = () => {};

const HomeScreen: React.FC<HomeScreenProps> = ({
  onPressNewGame,
  onPressContinue,
  onPressStats,
  onPressSettings,
  continueAvailable = false,
}) => {
  const { width } = useWindowDimensions();
  const buttonWidth = Math.max(160, Math.round(width / 3));

  const buttons = [
    { label: TEXTS.home.newGame, onPress: onPressNewGame, disabled: false },
    { label: TEXTS.home.continue, onPress: onPressContinue, disabled: !continueAvailable },
    { label: TEXTS.home.stats, onPress: onPressStats, disabled: false },
    { label: TEXTS.home.settings, onPress: onPressSettings, disabled: false },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>{TEXTS.appName}</Text>

        <View style={styles.menuList}>
          {buttons.map(btn => (
            <View key={btn.label} style={styles.menuRow}>
              <TouchableOpacity
                style={[
                  styles.menuButton,
                  { width: buttonWidth },
                  btn.disabled && styles.menuButtonDisabled,
                ]}
                activeOpacity={0.85}
                onPress={btn.disabled ? noop : btn.onPress ?? noop}
              >
                <Text style={styles.menuLabel}>{btn.label}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#eff3ff' },
  container: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2b5be3',
    textAlign: 'center',
    marginBottom: 40,
  },
  menuList: {
    gap: 18,
  },
  menuRow: {
    alignItems: 'center',
  },
  menuButton: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#1f2a4380',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  menuButtonDisabled: {
    opacity: 0.4,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1b1d23',
  },
});
