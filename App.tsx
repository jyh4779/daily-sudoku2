import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, StatusBar, View, Image, StyleSheet, Alert } from 'react-native';
import mobileAds from 'react-native-google-mobile-ads';
import AppLogger from './src/core/logger/AppLogger';
import { log } from './src/core/logger/log';
import { appendFileLog, fileLogPaths } from './src/core/logger/fileLogger';
import { TEXTS } from './src/config/texts';
import SudokuScreen from './src/features/sudoku/SudokuScreen';
import HomeScreen from './src/features/home/HomeScreen';
import StatsScreen from './src/features/stats/StatsScreen';
import { hasSavedGameSnapshot } from './src/features/sudoku/data/SavedGameRepository';

const splashArt = require('./src/assets/splash.png');

export default function App() {
  const [screen, setScreen] = useState<'splash' | 'home' | 'game' | 'stats'>('splash');
  const [gameMode, setGameMode] = useState<'new' | 'resume'>('new');
  const [canResume, setCanResume] = useState(false);

  useEffect(() => {
    AppLogger.init();
    void log('APP', 'mounted');
    void mobileAds().initialize();
    void appendFileLog('app mounted', { logFile: fileLogPaths.file });
  }, []);

  const refreshResumeAvailability = useCallback(() => {
    void hasSavedGameSnapshot()
      .then(setCanResume)
      .catch(() => setCanResume(false));
  }, []);

  useEffect(() => {
    refreshResumeAvailability();
  }, [refreshResumeAvailability]);

  useEffect(() => {
    if (screen === 'splash') {
      const timer = setTimeout(() => {
        setScreen('home');
      }, 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [screen]);

  const startNewGame = () => {
    setGameMode('new');
    setScreen('game');
  };
  const handleStartNewGame = () => {
    if (canResume) {
      Alert.alert(TEXTS.home.newGame, TEXTS.home.newGameWarning, [
        { text: TEXTS.common.cancel, style: 'cancel' },
        { text: TEXTS.common.confirm, onPress: startNewGame },
      ]);
    } else {
      startNewGame();
    }
  };
  const handleContinueGame = () => {
    setGameMode('resume');
    setScreen('game');
  };
  const handleGoHome = () => {
    setScreen('home');
    refreshResumeAvailability();
  };
  const handleOpenStats = () => {
    setScreen('stats');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="dark-content" />
      {screen === 'splash' && (
        <View style={styles.splashContainer}>
          <Image source={splashArt} style={styles.splashImage} resizeMode="contain" />
        </View>
      )}
      {screen === 'home' && (
        <HomeScreen
          onPressNewGame={handleStartNewGame}
          onPressContinue={canResume ? handleContinueGame : undefined}
          onPressStats={handleOpenStats}
          continueAvailable={canResume}
        />
      )}
      {screen === 'game' && <SudokuScreen onGoHome={handleGoHome} mode={gameMode} />}
      {screen === 'stats' && <StatsScreen onGoBack={handleGoHome} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#fff6ea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashImage: {
    width: '70%',
    height: '70%',
  },
});
