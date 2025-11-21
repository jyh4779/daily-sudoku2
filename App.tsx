import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, StatusBar, View, Image, StyleSheet, Alert, Text, TouchableOpacity } from 'react-native';
import mobileAds from 'react-native-google-mobile-ads';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AppLogger from './src/core/logger/AppLogger';
import { log } from './src/core/logger/log';
import { appendFileLog, fileLogPaths } from './src/core/logger/fileLogger';
import { TEXTS } from './src/config/texts';
import { GOOGLE_WEB_CLIENT_ID } from './src/config/auth';
import SudokuScreen from './src/features/sudoku/SudokuScreen';
import HomeScreen from './src/features/home/HomeScreen';
import StatsScreen from './src/features/stats/StatsScreen';
import { hasSavedGameSnapshot } from './src/features/sudoku/data/SavedGameRepository';

const splashArt = require('./src/assets/splash.png');

type ScreenState = 'splash' | 'home' | 'game' | 'stats';
type GuestUser = { type: 'guest'; id: string };
type GoogleUser = { type: 'google'; uid: string; email?: string | null; name?: string | null };
type UserState = GuestUser | GoogleUser | null;
const GUEST_ID_KEY = '@dailysudoku/guestId';

export default function App() {
  const [screen, setScreen] = useState<ScreenState>('splash');
  const [gameMode, setGameMode] = useState<'new' | 'resume'>('new');
  const [canResume, setCanResume] = useState(false);
  const [user, setUser] = useState<UserState>(null);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    AppLogger.init();
    void log('APP', 'mounted');
    void mobileAds().initialize();
    void appendFileLog('app mounted', { logFile: fileLogPaths.file });

    if (GOOGLE_WEB_CLIENT_ID) {
      GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        offlineAccess: true,
      });
    } else {
      console.warn('GOOGLE_WEB_CLIENT_ID is empty. Google Sign-In will fail until set.');
    }
  }, []);

  useEffect(() => {
    const initGuestUser = async () => {
      try {
        let id = await AsyncStorage.getItem(GUEST_ID_KEY);
        if (!id) {
          id = `guest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
          await AsyncStorage.setItem(GUEST_ID_KEY, id);
        }
        setGuestId(id);
        await appendFileLog('guest id ready', { id });
      } catch (error) {
        console.warn('Failed to prepare guest user', error);
        await appendFileLog('guest user error', { error: String((error as Error)?.message ?? error) });
      }
    };
    void initGuestUser();
  }, []);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(firebaseUser => {
      if (firebaseUser) {
        setUser({
          type: 'google',
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName,
        });
        void appendFileLog('google auth state', { uid: firebaseUser.uid });
      } else {
        setUser(prev => (prev && prev.type === 'google' ? null : prev));
      }
    });
    return unsubscribe;
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
    if (screen === 'splash' && user) {
      const timer = setTimeout(() => {
        setScreen('home');
      }, 700);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [screen, user]);

  const startNewGame = () => {
    setGameMode('new');
    setScreen('game');
  };
  const handleSelectGuest = () => {
    if (guestId) {
      setUser({ type: 'guest', id: guestId });
      setScreen('home');
      void appendFileLog('guest selected', { id: guestId });
    } else {
      Alert.alert('Error', 'Guest ID not ready yet. Please try again.');
    }
  };
  const handleGoogleSignIn = async () => {
    if (signingIn) return;
    try {
      if (!GOOGLE_WEB_CLIENT_ID) {
        Alert.alert('Google Sign-In', 'WEB_CLIENT_ID가 설정되어 있지 않습니다.');
        return;
      }
      setSigningIn(true);
      await GoogleSignin.hasPlayServices();
      const { idToken } = await GoogleSignin.signIn();
      const credential = auth.GoogleAuthProvider.credential(idToken);
      await auth().signInWithCredential(credential);
      setScreen('home');
      await appendFileLog('google sign-in success');
    } catch (error: any) {
      console.warn('Google sign-in failed', error);
      await appendFileLog('google sign-in failed', { error: String(error?.message ?? error) });
      Alert.alert('Google Sign-In', '로그인에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setSigningIn(false);
    }
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
          <Text style={styles.splashStatus}>
            {user
              ? user.type === 'guest'
                ? `Guest ID: ${user.id}`
                : `Welcome ${user.name ?? user.email ?? user.uid}`
              : '로그인 방법을 선택해 주세요'}
          </Text>
          {!user && (
            <View style={styles.splashButtons}>
              <TouchableOpacity
                style={[styles.btnGoogle, signingIn && styles.btnDisabled]}
                onPress={handleGoogleSignIn}
                activeOpacity={0.9}
                disabled={signingIn}
              >
                <Text style={styles.btnGoogleText}>{signingIn ? '로그인 중...' : 'Google 로그인'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnGuest} onPress={handleSelectGuest} activeOpacity={0.9}>
                <Text style={styles.btnGuestText}>게스트로 시작</Text>
              </TouchableOpacity>
            </View>
          )}
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
  splashStatus: {
    marginTop: 16,
    fontSize: 14,
    color: '#4f4f57',
  },
  splashButtons: {
    marginTop: 24,
    width: '80%',
    gap: 12,
  },
  btnGoogle: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f4b2cf',
    alignItems: 'center',
  },
  btnGoogleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f1f25',
  },
  btnGuest: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#ffe0ad',
    alignItems: 'center',
  },
  btnGuestText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f1f25',
  },
  btnDisabled: {
    opacity: 0.65,
  },
});
