import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, StatusBar, View, Image, StyleSheet, Alert, Text } from 'react-native';
import mobileAds from 'react-native-google-mobile-ads';
import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import AppLogger from './src/core/logger/AppLogger';
import { log } from './src/core/logger/log';
import { appendFileLog, fileLogPaths } from './src/core/logger/fileLogger';
import { TEXTS } from './src/config/texts';
import SudokuScreen from './src/features/sudoku/SudokuScreen';
import HomeScreen from './src/features/home/HomeScreen';
import StatsScreen from './src/features/stats/StatsScreen';
import SettingsScreen from './src/features/settings/SettingsScreen';
import { hasSavedGameSnapshot, loadSavedGameSnapshot } from './src/features/sudoku/data/SavedGameRepository';
import { initGoogleSignin, signInWithGoogle, getCurrentUser, signInAnonymously, waitForAuthInit } from './src/core/auth/AuthRepository';
import { saveGameResult } from './src/features/stats/data/StatsRepository';

const splashArt = require('./src/assets/splash.png');

type ScreenState = 'splash' | 'home' | 'game' | 'stats' | 'settings';
type UserType = 'guest' | 'google';
type AppUser = { type: UserType; id: string; name?: string | null };

export default function App() {
  const [screen, setScreen] = useState<ScreenState>('splash');
  const [gameMode, setGameMode] = useState<'new' | 'resume' | 'tutorial'>('new');
  const [canResume, setCanResume] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showLoginButtons, setShowLoginButtons] = useState(false);

  useEffect(() => {
    AppLogger.init();
    initGoogleSignin();
    void log('APP', 'mounted');
    void mobileAds().initialize();
    void appendFileLog('app mounted', { logFile: fileLogPaths.file });
  }, []);

  const updateUserState = async () => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      const type = currentUser.isAnonymous ? 'guest' : 'google';
      setUser({ type, id: currentUser.uid, name: currentUser.displayName });
      await appendFileLog('user state updated', { uid: currentUser.uid, type });
      return type;
    } else {
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      // Wait for Firebase to restore auth state
      await waitForAuthInit();

      const type = await updateUserState();

      if (type) {
        // Auto-navigate for both Google and Guest users
        setTimeout(() => setScreen('home'), 1000);
        return;
      }

      // If no user, show login buttons
      setShowLoginButtons(true);
    };
    void bootstrap();
  }, []);

  const refreshResumeAvailability = useCallback(() => {
    void hasSavedGameSnapshot()
      .then(setCanResume)
      .catch(() => setCanResume(false));
  }, []);

  useEffect(() => {
    refreshResumeAvailability();
  }, [refreshResumeAvailability]);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const googleUser = await signInWithGoogle();
      setUser({ type: 'google', id: googleUser.uid, name: googleUser.displayName });
      setScreen('home');
    } catch (error) {
      console.error('Google Sign-In failed', error);
      Alert.alert('Login Failed', 'Could not sign in with Google.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGuestContinue = async () => {
    setIsSigningIn(true);
    try {
      const anonUser = await signInAnonymously();
      setUser({ type: 'guest', id: anonUser.uid });
      await appendFileLog('anonymous user created', { uid: anonUser.uid });
      setScreen('home');
    } catch (error) {
      console.warn('Failed to sign in anonymously', error);
      Alert.alert('Error', 'Could not sign in as guest.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const startNewGame = () => {
    setGameMode('new');
    setScreen('game');
  };
  const handleStartNewGame = () => {
    if (canResume) {
      Alert.alert(TEXTS.home.newGame, TEXTS.home.newGameWarning, [
        { text: TEXTS.common.cancel, style: 'cancel' },
        {
          text: TEXTS.common.confirm,
          onPress: async () => {
            // Record loss for the abandoned game
            try {
              const snapshot = await loadSavedGameSnapshot();
              if (snapshot && user) {
                const now = Math.floor(Date.now() / 1000);
                await saveGameResult({
                  userId: user.id,
                  difficulty: snapshot.difficulty ?? 'easy',
                  mistakes: snapshot.mistakes ?? 0,
                  startTime: now - (snapshot.elapsedSec ?? 0),
                  endTime: now,
                  durationSeconds: snapshot.elapsedSec ?? 0,
                  result: 'loss',
                });
              }
            } catch (e) {
              console.warn('Failed to record loss for abandoned game', e);
            }
            startNewGame();
          },
        },
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
  const handleOpenSettings = () => {
    setScreen('settings');
  };
  const handleStartTutorial = () => {
    setGameMode('tutorial');
    setScreen('game');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="dark-content" />
      {screen === 'splash' && (
        <View style={styles.splashContainer}>
          <Image source={splashArt} style={styles.splashImage} resizeMode="contain" />
          <View style={styles.authContainer}>
            {showLoginButtons && (
              <>
                <GoogleSigninButton
                  size={GoogleSigninButton.Size.Wide}
                  color={GoogleSigninButton.Color.Dark}
                  onPress={handleGoogleSignIn}
                  disabled={isSigningIn}
                  style={styles.googleButton}
                />

                <Text style={styles.continueText} onPress={handleGuestContinue}>
                  {isSigningIn ? 'Signing in...' : 'Continue as Guest'}
                </Text>
              </>
            )}
            {!showLoginButtons && <Text style={styles.guestText}>Initializing...</Text>}
          </View>
        </View>
      )}
      {screen === 'home' && (
        <HomeScreen
          onPressNewGame={handleStartNewGame}
          onPressContinue={canResume ? handleContinueGame : undefined}
          onPressStats={handleOpenStats}
          onPressSettings={handleOpenSettings}
          continueAvailable={canResume}
        />
      )}
      {screen === 'game' && <SudokuScreen onGoHome={handleGoHome} mode={gameMode} />}
      {screen === 'stats' && <StatsScreen onGoBack={handleGoHome} />}
      {screen === 'settings' && <SettingsScreen onGoBack={handleGoHome} onUserChanged={updateUserState} onStartTutorial={handleStartTutorial} />}
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
    width: '60%',
    height: '60%',
    marginBottom: 20,
  },
  authContainer: {
    alignItems: 'center',
    gap: 16,
    width: '100%',
    paddingHorizontal: 32,
  },
  guestText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  googleButton: {
    width: '100%',
    height: 48,
  },
  continueText: {
    fontSize: 16,
    color: '#5b7df6',
    fontWeight: '600',
    marginTop: 8,
    textDecorationLine: 'underline',
  },
});
