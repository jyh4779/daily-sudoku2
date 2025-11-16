import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent, useWindowDimensions, Pressable } from 'react-native';
import Board from './view/Board';
import NumberPad from './view/NumberPad';
import ActionButtons from './view/ActionButtons';
import { useSudokuStore } from './viewmodel/sudokuStore';
import AspectFitContainer from '../../components/layout/AspectFitContainer';

type SudokuScreenProps = {
  onGoHome?: () => void;
  mode: 'new' | 'resume';
};

const SudokuScreen: React.FC<SudokuScreenProps> = ({ onGoHome, mode }) => {
  const { width } = useWindowDimensions();
  const GUTTER = Math.max(16, Math.min(24, Math.round(width * 0.04)));

  const [boardBox, setBoardBox] = useState<{ w: number; h: number } | null>(null);
  const loadRandomEasy = useSudokuStore(s => s.loadRandomEasy);
  const mistakes = useSudokuStore(s => s.mistakes);
  const mistakeLimit = useSudokuStore(s => s.mistakeLimit);
  const values = useSudokuStore(s => s.values);
  const solution = useSudokuStore(s => s.solution);
  const resetMistakes = useSudokuStore(s => s.resetMistakes);
  const restartCurrent = useSudokuStore(s => s.restartCurrent);
  const elapsedSec = useSudokuStore(s => s.elapsedSec);
  const resetElapsed = useSudokuStore(s => s.resetElapsed);
  const incrementElapsed = useSudokuStore(s => s.incrementElapsed);
  const loadSavedGameFromDb = useSudokuStore(s => s.loadSavedGameFromDb);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const bootstrap = async () => {
      try {
        if (mode === 'resume') {
          const loaded = await loadSavedGameFromDb();
          if (!loaded) {
            await loadRandomEasy();
          }
        } else {
          await loadRandomEasy();
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
  }, [mode, loadRandomEasy, loadSavedGameFromDb]);

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
    if (isLost || isSolved || isPaused) return;
    const id = setInterval(() => incrementElapsed(), 1000);
    return () => clearInterval(id);
  }, [isLost, isSolved, isPaused, incrementElapsed]);
  const timeText = useMemo(() => {
    const h = Math.floor(elapsedSec / 3600);
    const m = Math.floor((elapsedSec % 3600) / 60);
    const s = elapsedSec % 60;
    const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }, [elapsedSec]);
  const handleRestart = () => { restartCurrent(); resetElapsed(); setIsPaused(false); };
  const handleNewGame = () => { loadRandomEasy().then(() => { resetElapsed(); setIsPaused(false); }); };
  const handlePause = () => {
    if (isLost || isSolved) return;
    setIsPaused(true);
  };
  const handleResume = () => setIsPaused(false);

  return (
    <>
    <AspectFitContainer ratio={[9, 16]} outerGutter={GUTTER} backgroundColor="#fdf8f4">
      {({ width: stageW, height: stageH }: { width: number; height: number }) => {
        const unit = stageH / 16;
        // Compute actual drawable board side the same way Board.tsx does
        // to avoid rounding leftovers that make centering look off.
        let boardSide = 0;
        if (boardBox) {
          const avail = Math.max(0, Math.min(boardBox.w, boardBox.h) - BOARD_PADDING * 2);
          const THIN = StyleSheet.hairlineWidth;
          const THICK = 2;
          const LINES_SUM = THICK * 4 + THIN * 6;
          const cell = Math.max(0, Math.floor((avail - LINES_SUM) / 9));
          boardSide = cell * 9 + LINES_SUM;
        }

        return (
          <View style={{ width: stageW, height: stageH }}>
            <View style={[styles.topBar, { height: unit }]}>
              <Text style={styles.topLeft}>{`\uC2E4\uC218 ${mistakes}/${mistakeLimit}`}</Text>
              <Text style={styles.topTitle}>{timeText}</Text>
              <Pressable
                style={[styles.pauseButton, (isPaused || isLost || isSolved) && styles.pauseButtonDisabled]}
                onPress={handlePause}
                disabled={isPaused || isLost || isSolved}
              >
                <View style={styles.pauseBar} />
                <View style={styles.pauseBar} />
              </Pressable>
            </View>

            <View style={[styles.difficultyWrap, { height: unit }]}>
              <Text style={styles.difficulty}>Easy</Text>
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
        {/* End-game overlays */}
    {(isLost || isSolved || isPaused) && (
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>
            {isPaused ? 'Pause' : isLost ? 'Loss' : 'Success'}
          </Text>
          {isPaused ? (
            <View style={styles.modalBtns}>
              <Pressable style={styles.modalBtn} onPress={handleResume}>
                <Text style={styles.modalBtnText}>Continue</Text>
              </Pressable>
              <Pressable style={styles.modalBtn} onPress={handleRestart}>
                <Text style={styles.modalBtnText}>Restart</Text>
              </Pressable>
            </View>
          ) : isLost ? (
            <View style={styles.modalBtns}>
              <Pressable style={styles.modalBtn} onPress={handleRestart}>
                <Text style={styles.modalBtnText}>Restart</Text>
              </Pressable>
              <Pressable style={styles.modalBtn} onPress={resetMistakes}>
                <Text style={styles.modalBtnText}>Continue</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.modalBtns}>
              <Pressable style={styles.modalBtn} onPress={handleNewGame}>
                <Text style={styles.modalBtnText}>New Game</Text>
              </Pressable>
              <Pressable style={styles.modalBtn} onPress={onGoHome}>
                <Text style={styles.modalBtnText}>Home</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    )}</>
  );
};

export default SudokuScreen;

const styles = StyleSheet.create({
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
    backgroundColor: '#fdf0f6',
  },

  tools: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
});










