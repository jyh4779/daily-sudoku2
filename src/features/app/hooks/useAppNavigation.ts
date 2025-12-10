import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { hasSavedGameSnapshot, loadSavedGameSnapshot } from '../../sudoku/data/SavedGameRepository';
import { saveGameResult } from '../../stats/data/StatsRepository';
import SoundManager from '../../../core/audio/SoundManager';
import { useTexts } from '../../../config/texts';
import { AppUser } from './useGoogleAuth';

export type ScreenState = 'splash' | 'home' | 'game' | 'settings';
export type GameMode = 'new' | 'resume' | 'tutorial';
export type GameDifficulty = 'beginner' | 'easy' | 'medium' | 'hard' | 'expert';

export const useAppNavigation = (user: AppUser | null) => {
    const texts = useTexts();
    const [screen, setScreen] = useState<ScreenState>('splash');
    const [gameMode, setGameMode] = useState<GameMode>('new');
    const [canResume, setCanResume] = useState(false);
    const [gameDifficulty, setGameDifficulty] = useState<GameDifficulty>('easy');
    const [isDailyChallenge, setIsDailyChallenge] = useState(false);

    useEffect(() => {
        if (screen === 'home') {
            SoundManager.playBGM();
        }
    }, [screen]);

    const refreshResumeAvailability = useCallback(() => {
        void hasSavedGameSnapshot('normal')
            .then(setCanResume)
            .catch(() => setCanResume(false));
    }, []);

    useEffect(() => {
        refreshResumeAvailability();
    }, [refreshResumeAvailability]);

    const handleStartNewGame = (difficulty: string = 'easy') => {
        const targetDifficulty = difficulty as GameDifficulty;

        if (canResume) {
            Alert.alert(texts.home.newGameAlertTitle, texts.home.newGameAlertMessage, [
                { text: texts.common.cancel, style: 'cancel' },
                {
                    text: texts.common.confirm,
                    onPress: async () => {
                        // Record loss for the abandoned game
                        try {
                            const snapshot = await loadSavedGameSnapshot('normal');
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

                        setGameDifficulty(targetDifficulty);
                        setIsDailyChallenge(false);
                        setGameMode('new');
                        setScreen('game');
                    },
                },
            ]);
        } else {
            setGameDifficulty(targetDifficulty);
            setIsDailyChallenge(false);
            setGameMode('new');
            setScreen('game');
        }
    };

    const handleStartDailyChallenge = async (dateString: string) => {
        const hasSave = await hasSavedGameSnapshot('daily', dateString);

        if (hasSave) {
            Alert.alert(texts.daily.startAlertTitle, texts.daily.startAlertMessage, [
                { text: texts.daily.startAlertCancel, style: 'cancel' },
                {
                    text: texts.daily.startAlertStart,
                    onPress: async () => {
                        setGameDifficulty('medium');
                        setIsDailyChallenge(true);
                        setGameMode('new');
                        setScreen('game');
                    }
                },
                {
                    text: texts.home.continue,
                    onPress: () => {
                        setGameDifficulty('medium'); // Difficulty is loaded from save anyway
                        setIsDailyChallenge(true);
                        setGameMode('resume');
                        setScreen('game');
                    }
                }
            ]);
        } else {
            setGameDifficulty('medium');
            setIsDailyChallenge(true);
            setGameMode('new');
            setScreen('game');
        }
    };

    const handleContinueGame = () => {
        setGameMode('resume');
        setIsDailyChallenge(false);
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
        setIsDailyChallenge(false);
        setScreen('game');
    };

    return {
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
    };
};
