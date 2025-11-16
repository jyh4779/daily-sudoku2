// src/features/sudoku/view/Board.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useSudokuStore } from '../viewmodel/sudokuStore';

type Props = { size: number };

const N = 9;
const empty9 = () => Array.from({ length: N }, () => Array(N).fill(0));

export default function Board({ size }: Props) {
  const values   = useSudokuStore(s => s.values);
  const puzzle   = useSudokuStore(s => s.puzzle);
  const solution = useSudokuStore(s => s.solution);
  const selected = useSudokuStore(s => s.selected);
  const setSel   = useSudokuStore(s => s.setSelected);
  const notes    = useSudokuStore(s => s.notes);
  const noteMode = useSudokuStore(s => s.noteMode ?? false);
  const padSelectMode = useSudokuStore(s => s.padSelectMode ?? false);
  const selectedPad = useSudokuStore(s => s.selectedPad ?? null);
  const toggleNoteAtSelected = useSudokuStore(s => s.toggleNoteAtSelected);
  const inputNumber = useSudokuStore(s => s.inputNumber);

  const vGrid = (values?.length === N && values.every(r => r?.length === N)) ? values : empty9();
  const pGrid = (puzzle?.length === N && puzzle.every(r => r?.length === N)) ? puzzle : empty9();
  const sGrid = (solution?.length === N && solution.every(r => r?.length === N)) ? solution : empty9();
  const nGrid = (notes?.length === N && notes.every(r => r?.length === N)) ? notes : empty9();

  // Determine a highlight digit: selected pad in pad-select mode, otherwise selected cell's value
  const highlightDigit: number | null = React.useMemo(() => {
    if (padSelectMode && selectedPad) return selectedPad;
    if (selected) {
      const vv = vGrid[selected.r]?.[selected.c] || 0;
      if (vv > 0) return vv;
    }
    return null;
  }, [padSelectMode, selectedPad, selected, vGrid]);

  // 선 두께 정의
  const THIN  = StyleSheet.hairlineWidth;       // 얇은 선
  const THICK = 2;                               // 굵은 선(필요하면 3으로)
  // 보드 전체에 존재하는 수직/수평 선의 총 두께 (0..9까지 10개 선: 0/3/6/9는 굵게)
  const LINES_SUM = (THICK * 4) + (THIN * 6);

  // 선 두께를 먼저 제외하고 셀 크기 산출 → 오차/이중선 제거
  const cell = Math.floor((size - LINES_SUM) / N);
  // 실 보드 픽셀 (셀*N + 선 두께 합)
  const boardSide = cell * N + LINES_SUM;

  return (
    <View style={[styles.board, { width: boardSide, height: boardSide }]}>
      {Array.from({ length: N }).map((_, r) => (
        <View key={r} style={styles.row}>
          {Array.from({ length: N }).map((_, c) => {
            const v      = vGrid[r][c];
            const fixed  = !!pGrid[r][c];
            const isSel  = !!(selected && selected.r === r && selected.c === c);
            const isWrong = !fixed && v !== 0 && sGrid[r][c] !== 0 && v !== sGrid[r][c];

            // 각 셀은 "왼쪽/위쪽" 선만 그립니다. (마지막 행/열에서만 바깥쪽을 닫음)
            const cellBorder: StyleProp<ViewStyle> = {
              borderLeftWidth:  (c === 0 || c % 3 === 0) ? THICK : THIN,
              borderTopWidth:   (r === 0 || r % 3 === 0) ? THICK : THIN,
              // 바깥 테두리 마감
              borderRightWidth:  c === N - 1 ? THICK : 0,
              borderBottomWidth: r === N - 1 ? THICK : 0,
              borderColor: '#7aa8ff',
            };

            const noteMask = nGrid[r]?.[c] || 0;
            return (
              <Pressable
                key={c}
                onPress={() => {
                  // If pad-select mode with a chosen number, apply that number (or note) to empty editable cells
                  if (padSelectMode && selectedPad && puzzle[r][c] === 0) {
                    if (v === 0) {
                      setSel({ r, c });
                      if (noteMode) {
                        toggleNoteAtSelected && toggleNoteAtSelected(selectedPad);
                      } else {
                        inputNumber && inputNumber(selectedPad);
                      }
                      return;
                    }
                  }
                  setSel({ r, c });
                }}
                style={[
                  styles.cell,
                  { width: cell, height: cell },
                  cellBorder,
                  fixed && styles.fixedCell,
                  isSel && styles.selectedCell,
                  isWrong && styles.wrongCell,
                  highlightDigit != null && (
                    v === highlightDigit || (v === 0 && (noteMask & (1 << highlightDigit)) !== 0)
                  ) && styles.highlightCell,
                ]}
              >
                {v > 0 ? (
                  <Text style={[
                    styles.text,
                    fixed && styles.fixedText,
                    isWrong && styles.wrongText,
                    highlightDigit != null && v === highlightDigit && styles.textHighlight,
                  ]}>
                    {String(v)}
                  </Text>
                ) : noteMask ? (
                  <View style={styles.notesGrid}>
                    {Array.from({ length: 9 }).map((_, i) => {
                      const d = i + 1;
                      const on = !!(noteMask & (1 << d));
                      return (
                        <View key={d} style={styles.noteCell}>
                          {on && (
                            <Text style={[
                              styles.noteText,
                              highlightDigit != null && d === highlightDigit && styles.noteTextHighlight,
                            ]}>{d}</Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: '#7aa8ff',
  },
  row: { flexDirection: 'row' },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    height: '100%',
    padding: 2,
  },
  noteCell: {
    width: '33.3333%',
    height: '33.3333%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteText: { fontSize: 9, color: '#7c8aa9' },
  noteTextHighlight: { fontWeight: '800', color: '#2f3b59', fontSize: 10 },
  fixedCell:    { backgroundColor: '#f0f4ff' },
  selectedCell: { backgroundColor: '#ffe1ef' },
  wrongCell:    { backgroundColor: '#ffd5de' },
  text:      { color: '#2b3654', fontWeight: '500', fontSize: 18 },
  fixedText: { color: '#1c2750', fontWeight: '700' },
  wrongText: { color: '#c11f3a', fontWeight: '700' },
  textHighlight: { fontWeight: '900', fontSize: 20, color: '#5b7df6' },
  highlightCell: { backgroundColor: '#f1f6ff' },
});
