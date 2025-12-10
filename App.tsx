import React, { useEffect } from 'react';
import { SafeAreaView, StatusBar, View, Image, StyleSheet, Text } from 'react-native';
import { GoogleSigninButton } from '@react-native-google-signin/google-signin';

import SudokuScreen from './src/features/sudoku/SudokuScreen';
import MainLayout from './src/features/home/MainLayout';
import SettingsScreen from './src/features/settings/SettingsScreen';

import { useAppBootstrap } from './src/features/app/hooks/useAppBootstrap';
import { useGoogleAuth } from './src/features/app/hooks/useGoogleAuth';
import { useAppNavigation } from './src/features/app/hooks/useAppNavigation';

const splashArt = require('./src/assets/splash.png');

export default function App() {
  const { isBootstrapped, showLoginButtons, bootstrap } = useAppBootstrap();
  const { user, isSigningIn, updateUserState, handleGoogleSignIn, handleGuestContinue } = useGoogleAuth();
  const {
    screen,
    setScreen,
    gameMode,
    gameDifficulty,
    isDailyChallenge,
    canResume,
    handleStartNewGame,
    handleStartDailyChallenge,
    handleContinueGame,
    handleGoHome,
    handleOpenSettings,
    handleStartTutorial,
  } = useAppNavigation(user);

  useEffect(() => {
    bootstrap(updateUserState, () => setScreen('home'));
  }, []);

  if (!isBootstrapped || screen === 'splash') {
    return (
      <View style={styles.splashContainer}>
        <Image source={splashArt} style={styles.splashImage} resizeMode="contain" />
        <View style={styles.authContainer}>
          {showLoginButtons && (
            <>
              <GoogleSigninButton
                size={GoogleSigninButton.Size.Wide}
                color={GoogleSigninButton.Color.Dark}
                onPress={() => handleGoogleSignIn(() => setScreen('home'))}
                disabled={isSigningIn}
                style={styles.googleButton}
              />
              <Text style={styles.continueText} onPress={() => handleGuestContinue(() => setScreen('home'))}>
                {isSigningIn ? 'Signing in...' : 'Continue as Guest'}
              </Text>
            </>
          )}
          {!showLoginButtons && <Text style={styles.guestText}>Initializing...</Text>}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {screen === 'home' && (
        <MainLayout
          onPressNewGame={handleStartNewGame}
          onPressContinue={canResume ? handleContinueGame : () => { }}
          onPressSettings={handleOpenSettings}
          onPressDailyChallenge={handleStartDailyChallenge}
          continueAvailable={canResume}
          onGoHome={handleGoHome}
        />
      )}
      {screen === 'game' && <SudokuScreen onGoHome={handleGoHome} mode={gameMode} difficulty={gameDifficulty} isDailyChallenge={isDailyChallenge} />}
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

