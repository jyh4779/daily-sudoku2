import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, StatusBar, View, Image, StyleSheet, Alert, Text } from 'react-native';
import mobileAds from 'react-native-google-mobile-ads';
import { GoogleSigninButton, statusCodes } from '@react-native-google-signin/google-signin';
import AppLogger from './src/core/logger/AppLogger';
import { log } from './src/core/logger/log';
import { appendFileLog, fileLogPaths } from './src/core/logger/fileLogger';
import { useTexts } from './src/config/texts';
import SudokuScreen from './src/features/sudoku/SudokuScreen';
import MainLayout from './src/features/home/MainLayout';
import SettingsScreen from './src/features/settings/SettingsScreen';
import { hasSavedGameSnapshot, loadSavedGameSnapshot } from './src/features/sudoku/data/SavedGameRepository';
import { initGoogleSignin, signInWithGoogle, getCurrentUser, signInAnonymously, waitForAuthInit } from './src/core/auth/AuthRepository';
import { saveGameResult } from './src/features/stats/data/StatsRepository';
import { checkAppVersion } from './src/core/version/VersionCheckRepository';
import { Linking } from 'react-native';

const splashArt = require('./src/assets/splash.png');

type ScreenState = 'splash' | 'home' | 'game' | 'settings';
type UserType = 'guest' | 'google';
type AppUser = { type: UserType; id: string; name?: string | null };

export default function App() {
  const texts = useTexts();
  const [screen, setScreen] = useState<ScreenState>('splash');
  const [gameMode, setGameMode] = useState<'new' | 'resume' | 'tutorial'>('new');
  const [canResume, setCanResume] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showLoginButtons, setShowLoginButtons] = useState(false);
  const [gameDifficulty, setGameDifficulty] = useState<'beginner' | 'easy' | 'medium' | 'hard' | 'expert'>('easy');

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
    const continueBootstrap = async () => {
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

    const bootstrap = async () => {
      // Check for app updates
      const { needsUpdate, storeUrl } = await checkAppVersion();
      if (needsUpdate && storeUrl) {
        Alert.alert(
          texts.common.updateTitle,
          texts.common.updateMessage,
          [
            {
              text: texts.common.updateLater,
              style: 'cancel',
              onPress: () => continueBootstrap(),
            },
            {
              text: texts.common.updateNow,
              onPress: () => {
                Linking.openURL(storeUrl);
              },
            },
          ],
          { cancelable: false }
        );
        return;
      }

      await continueBootstrap();
    };

    void bootstrap();
  }, [texts]);

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
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('Google Sign-In cancelled');
      } else {
        console.error('Google Sign-In failed', error);
        Alert.alert('Login Failed', 'Could not sign in with Google.');
      }
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

  const handleStartNewGame = (difficulty: string = 'easy') => {
    if (canResume) {
      Alert.alert(texts.home.newGameAlertTitle, texts.home.newGameAlertMessage, [
        { text: texts.common.cancel, style: 'cancel' },
        {
          text: texts.common.confirm,
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
            // @ts-ignore
            setGameDifficulty(difficulty);
            setGameMode('new');
            setScreen('game');
          },
        },
      ]);
    } else {
      // @ts-ignore
      setGameDifficulty(difficulty);
      setGameMode('new');
      setScreen('game');
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
        <MainLayout
          onPressNewGame={handleStartNewGame}
          onPressContinue={canResume ? handleContinueGame : () => { }}
          onPressSettings={handleOpenSettings}
          continueAvailable={canResume}
          onGoHome={handleGoHome}
        />
      )}
      {screen === 'game' && <SudokuScreen onGoHome={handleGoHome} mode={gameMode} difficulty={gameDifficulty} />}
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
