import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import AppLogger from './src/core/logger/AppLogger';
import { log } from './src/core/logger/log';
import SudokuScreen from './src/features/sudoku/SudokuScreen';
import HomeScreen from './src/features/home/HomeScreen';
import { hasSavedGameSnapshot } from './src/features/sudoku/data/SavedGameRepository';

export default function App() {
  const [screen, setScreen] = useState<'home' | 'game'>('home');
  const [gameMode, setGameMode] = useState<'new' | 'resume'>('new');
  const [canResume, setCanResume] = useState(false);

  useEffect(() => {
    AppLogger.init();
    void log('APP', 'mounted');
  }, []);

  const refreshResumeAvailability = useCallback(() => {
    void hasSavedGameSnapshot()
      .then(setCanResume)
      .catch(() => setCanResume(false));
  }, []);

  useEffect(() => {
    refreshResumeAvailability();
  }, [refreshResumeAvailability]);

  const handleStartNewGame = () => {
    setGameMode('new');
    setScreen('game');
  };
  const handleContinueGame = () => {
    setGameMode('resume');
    setScreen('game');
  };
  const handleGoHome = () => {
    setScreen('home');
    refreshResumeAvailability();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="dark-content" />
      {screen === 'home' ? (
        <HomeScreen
          onPressNewGame={handleStartNewGame}
          onPressContinue={canResume ? handleContinueGame : undefined}
          continueAvailable={canResume}
        />
      ) : (
        <SudokuScreen onGoHome={handleGoHome} mode={gameMode} />
      )}
    </SafeAreaView>
  );
}
