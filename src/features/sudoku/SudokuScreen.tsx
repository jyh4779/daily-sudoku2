import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent, useWindowDimensions, Pressable, Platform, BackHandler } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import Board from './view/Board';
import NumberPad from './view/NumberPad';
import ActionButtons from './view/ActionButtons';
import { useSudokuStore } from './viewmodel/sudokuStore';
import AspectFitContainer from '../../components/layout/AspectFitContainer';
import { useTexts } from '../../config/texts';
import { ADMOB_IDS, BANNER_RESERVED_SPACE } from '../../config/admob';
import { getCurrentUser } from '../../core/auth/AuthRepository';
import { saveGameResult } from '../stats/data/StatsRepository';
import TutorialOverlay from './view/TutorialOverlay';
import AiHintModal from './view/AiHintModal';
import { TUTORIAL_PUZZLE_60, TUTORIAL_SOLUTION } from './data/tutorialData';
import SoundManager from '../../core/audio/SoundManager';

type SudokuScreenProps = {
  onGoHome?: () => void;
  mode: 'new' | 'resume' | 'tutorial';
  difficulty?: 'beginner' | 'easy' | 'medium' | 'hard' | 'expert';
  isDailyChallenge?: boolean;
};

const SudokuScreen: React.FC<SudokuScreenProps> = ({ onGoHome, mode, difficulty = 'easy', isDailyChallenge = false }) => {
  const texts = useTexts();
  const { width } = useWindowDimensions();
  const GUTTER = Math.max(16, Math.min(24, Math.round(width * 0.04)));

  const [boardBox, setBoardBox] = useState<{ w: number; h: number } | null>(null);

  const incrementElapsed = useSudokuStore(s => s.incrementElapsed);
  const loadSavedGameFromDb = useSudokuStore(s => s.loadSavedGameFromDb);
  const clearSavedProgress = useSudokuStore(s => s.clearSavedProgress);
  const loadNewGame = useSudokuStore(s => s.loadNewGame);
  const loadTutorialPuzzle = useSudokuStore(s => s.loadTutorialPuzzle);
  const restartCurrent = useSudokuStore(s => s.restartCurrent);
  const resetElapsed = useSudokuStore(s => s.resetElapsed);
  const resetMistakes = useSudokuStore(s => s.resetMistakes);

  const values = useSudokuStore(s => s.values);
  const solution = useSudokuStore(s => s.solution);
  const mistakes = useSudokuStore(s => s.mistakes);
  const mistakeLimit = useSudokuStore(s => s.mistakeLimit);
  const elapsedSec = useSudokuStore(s => s.elapsedSec);
  const hintsUsed = useSudokuStore(s => s.hintsUsed);
  const maxHints = useSudokuStore(s => s.maxHints);
  const storeDifficulty = useSudokuStore(s => s.difficulty);
  // We use the prop isDailyChallenge for loading, but store also has it. 
  // We don't necessarily need to read it from store if we trust the prop for initial load.

  const [isPaused, setIsPaused] = useState(false);
  const handleGoHome = onGoHome ?? (() => { });

  const [showTutorialOverlay, setShowTutorialOverlay] = useState(mode === 'tutorial');

  useEffect(() => {

  }, []);

  useEffect(() => {
    let isMounted = true;
    const bootstrap = async () => {
      try {
        if (mode === 'resume') {
          const loaded = await loadSavedGameFromDb(isDailyChallenge);
          if (!loaded) {
            const today = new Date().toISOString().split('T')[0];
            await loadNewGame(difficulty, isDailyChallenge, today);
          }
        } else if (mode === 'tutorial') {
          loadTutorialPuzzle(TUTORIAL_PUZZLE_60, TUTORIAL_SOLUTION);
        } else {
          const today = new Date().toISOString().split('T')[0];
          await loadNewGame(difficulty, isDailyChallenge, today);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (isMounted) setIsPaused(false);
      }
    };
    bootstrap();
    return () => {
      isMounted = false;
    };
  }, [mode, difficulty, isDailyChallenge, loadNewGame, loadSavedGameFromDb, loadTutorialPuzzle]);

  const onLayoutBoardArea = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    setBoardBox({ w, h });
  };

  const BOARD_PADDING = 6;

  // Detect end states
  const allFilled = useMemo(() => {
    if (!values) return false;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (!values[r]?.[c]) return false;
      }
    }
    return true;
  }, [values]);

  const isSolved = useMemo(() => {
    if (!values || !solution || !allFilled) return false;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (values[r]?.[c] !== solution[r]?.[c]) return false;
      }
    }
    return true;
  }, [values, solution, allFilled]);
  const isLost = mistakes >= mistakeLimit;

  useEffect(() => {
    const backAction = () => {
      if (!isPaused && !isSolved && !isLost) {
        setIsPaused(true);
        return true; // Prevent default behavior (exit)
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isPaused, isSolved, isLost, handleGoHome]);

  const [startTime, setStartTime] = useState(Date.now());

  useEffect(() => {
    setStartTime(Date.now());
  }, [mode, loadNewGame, restartCurrent]);


  useEffect(() => {
    if (isPaused || isSolved || isLost) return;
    const timer = setInterval(() => {
      incrementElapsed();
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaused, isSolved, isLost, incrementElapsed]);

  const timeText = useMemo(() => {
    const h = Math.floor(elapsedSec / 3600);
    const m = Math.floor((elapsedSec % 3600) / 60);
    const s = elapsedSec % 60;
    const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }, [elapsedSec]);

  const handleRestart = () => {
    restartCurrent();
    resetElapsed();
    setIsPaused(false);
    setStartTime(Date.now());
  };
  const handleNewGame = () => {
    loadNewGame(difficulty).then(() => {
      resetElapsed();
      setIsPaused(false);
      setStartTime(Date.now());
    });
  };
  const handlePause = () => {
    if (isLost || isSolved) return;
    setIsPaused(true);
  };
  const handleResume = () => setIsPaused(false);
  const bannerUnitId =
    Platform.select({
      android: ADMOB_IDS.android.banner,
      ios: ADMOB_IDS.ios.banner,
    }) ?? ADMOB_IDS.android.banner;

  useEffect(() => {
    if (isSolved || isLost) {
      const user = getCurrentUser();
      if (user) {
        const endTime = Date.now();
        const durationSeconds = Math.floor((endTime - startTime) / 1000);

        saveGameResult({
          userId: user.uid,
          difficulty: difficulty,
          mistakes: mistakes,
          startTime: Math.floor(startTime / 1000),
          endTime: Math.floor(endTime / 1000),
          durationSeconds: durationSeconds,
          result: isSolved ? 'win' : 'loss',
        }, undefined, isDailyChallenge).catch(err => console.warn('Failed to save game result', err));
      }
      void (clearSavedProgress?.(isDailyChallenge) ?? Promise.resolve());
    }
  }, [isSolved, isLost, clearSavedProgress, difficulty, mistakes, startTime]);

  return (
    <View style={styles.screen}>
      <AspectFitContainer ratio={[9, 16]} outerGutter={GUTTER} backgroundColor="#fdf8f4">
        {({ width: stageW, height: stageH }: { width: number; height: number }) => {
          const unit = stageH / 16;
          // Compute actual drawable board side the same way Board.tsx does
          // to avoid rounding leftovers that make centering look off.
          let boardSide = 0;
          if (boardBox) {
            const avail = Math.max(0, Math.min(boardBox.w, boardBox.h) - BOARD_PADDING * 2);
            const cell = Math.floor(avail / 9);
            boardSide = cell * 9;
          }

          return (
            <View style={{ width: stageW, height: stageH }}>
              <View style={[styles.topBar, { height: unit }]}>
                <View>
                  <Text style={styles.topLeft}>{texts.game.mistakeCounter(mistakes, mistakeLimit)}</Text>
                  <Text style={styles.topLeft}>Hints: {hintsUsed}/{maxHints}</Text>
                </View>
                <Text style={styles.topTitle}>{timeText}</Text>
                <View style={styles.topActions}>
                  <Pressable
                    style={[styles.pauseButton, (isPaused || isLost || isSolved) && styles.pauseButtonDisabled]}
                    onPress={handlePause}
                    disabled={isPaused || isLost || isSolved}
                  >
                    <View style={styles.pauseBar} />
                    <View style={styles.pauseBar} />
                  </Pressable>
                  <Pressable style={styles.homeButton} onPress={handleGoHome}>
                    <Text style={styles.homeIcon}>⌂</Text>
                  </Pressable>
                </View>
              </View>

              <View style={[styles.difficultyWrap, { height: unit }]}>
                <Text style={styles.difficulty}>{texts.game.difficulty[storeDifficulty]}</Text>
              </View>

              <View style={[styles.boardArea, { height: unit * 10 }]} onLayout={onLayoutBoardArea}>
                <View
                  style={[
                    styles.boardCard,
                    boardSide > 0 && {
                      width: boardSide + BOARD_PADDING * 2,
                      height: boardSide + BOARD_PADDING * 2,
                      padding: BOARD_PADDING,
                      alignSelf: 'center',
                    },
                  ]}
                >
                  {boardSide > 0 && (
                    isPaused ? (
                      <View style={[styles.boardMask, { width: boardSide, height: boardSide }]} />
                    ) : (
                      <Board size={boardSide} />
                    )
                  )}
                </View>
              </View>

              <View style={[styles.tools, { height: unit }]}>
                <ActionButtons />
              </View>

              {!isPaused && (
                <View style={[styles.padArea, { height: unit * 3 }]}>
                  <NumberPad />
                </View>
              )}
            </View>
          );
        }}
      </AspectFitContainer>

      {
        (isLost || isSolved || isPaused) && (
          <View style={styles.overlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                {isPaused
                  ? texts.game.overlayTitle.pause
                  : isLost
                    ? texts.game.overlayTitle.loss
                    : texts.game.overlayTitle.success}
              </Text>
              {isPaused ? (
                <View style={styles.modalBtns}>
                  <Pressable style={styles.modalBtn} onPress={handleResume}>
                    <Text style={styles.modalBtnText}>{texts.game.overlayButtons.continue}</Text>
                  </Pressable>
                  <Pressable style={styles.modalBtn} onPress={handleGoHome}>
                    <Text style={styles.modalBtnText}>{texts.game.overlayButtons.home}</Text>
                  </Pressable>
                </View>
              ) : isLost ? (
                <View style={styles.modalBtns}>
                  <Pressable style={styles.modalBtn} onPress={handleRestart}>
                    <Text style={styles.modalBtnText}>{texts.game.overlayButtons.restart}</Text>
                  </Pressable>
                  <Pressable style={styles.modalBtn} onPress={resetMistakes}>
                    <Text style={styles.modalBtnText}>{texts.game.overlayButtons.continue}</Text>
                  </Pressable>
                  <Pressable style={styles.modalBtn} onPress={handleGoHome}>
                    <Text style={styles.modalBtnText}>{texts.game.overlayButtons.home}</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.modalBtns}>
                  <Pressable style={styles.modalBtn} onPress={handleNewGame}>
                    <Text style={styles.modalBtnText}>{texts.game.overlayButtons.newGame}</Text>
                  </Pressable>
                  <Pressable style={styles.modalBtn} onPress={handleGoHome}>
                    <Text style={styles.modalBtnText}>{texts.game.overlayButtons.home}</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        )
      }

      {
        showTutorialOverlay && (
          <TutorialOverlay onComplete={() => setShowTutorialOverlay(false)} />
        )
      }

      <AiHintModal />

      <View style={styles.bannerArea}>
        <BannerAd
          unitId={bannerUnitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        />
      </View>
    </View>
  );
};

export default SudokuScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fdf8f4',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingHorizontal: 8,
  },
  topLeft: { fontSize: 12, color: '#6a7690', fontWeight: '600' },
  topTitle: { fontSize: 20, fontWeight: '800', color: '#2f3b59' },
  pauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#c5cfe5',
    backgroundColor: '#fff',
  },
  pauseButtonDisabled: { opacity: 0.5 },
  pauseBar: {
    width: 3,
    height: 16,
    borderRadius: 1.5,
    backgroundColor: '#5b7df6',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  homeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#c5cfe5',
  },
  homeIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5b7df6',
  },

  difficultyWrap: { alignItems: 'center', justifyContent: 'center' },
  difficulty: { fontSize: 14, color: '#7a89a8', fontWeight: '600' },

  boardArea: { justifyContent: 'center', alignItems: 'center' },
  boardCard: {
    borderRadius: 12,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardMask: {
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },

  tools: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 10,
  },

  padArea: { justifyContent: 'center', marginBottom: 6 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    elevation: 10,
  },
  modalCard: {
    minWidth: 240,
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    alignItems: 'center',
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#111', marginBottom: 12 },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalBtn: {
    backgroundColor: '#5b7df6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  modalBtnText: { color: '#fff', fontWeight: '700' },
  bannerArea: {
    height: BANNER_RESERVED_SPACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
