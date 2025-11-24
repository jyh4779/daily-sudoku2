import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Path, Rect, G } from 'react-native-svg';
import { useSudokuStore } from '../viewmodel/sudokuStore';
import EraserIcon from '../../../assets/icons/eraser.svg';
import UndoIcon from '../../../assets/icons/undo.svg';
import { useTexts } from '../../../config/texts';

type Action = 'undo' | 'erase' | 'note' | 'hint' | 'padmode';

type BtnProps = {
  action: Action;
  label: string;
  active?: boolean;
  onPress: () => void;
};

const size = 22;
const COLORS = {
  primary: '#5b7df6',
  neutral: '#7a8095',
  label: '#6f768f',
  labelActive: '#2f3b59',
  iconBg: '#ecf0ff',
  iconBgActive: '#f9cfe5',
};

function NoteIcon({ active }: { active?: boolean }) {
  const color = active ? COLORS.primary : COLORS.neutral;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="4" y="3" width="16" height="18" rx="2" stroke={color} strokeWidth="2" fill="none" />
      <G stroke={color} strokeWidth="1.6" strokeLinecap="round">
        <Path d="M8 8h8" />
        <Path d="M8 12h8" />
        <Path d="M8 16h5" />
      </G>
    </Svg>
  );
}
function HintIcon() {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 3a7 7 0 016.9 6.03c.2 1.44-.18 2.9-1.05 4.04-.62.82-1.35 1.52-1.85 2.41-.35.62-.57 1.32-.65 2.04H8.65c-.08-.72-.3-1.42-.65-2.04-.5-.89-1.23-1.6-1.85-2.41A5.98 5.98 0 015.1 9.03 7 7 0 0112 3z"
        fill="#ffeec5"
        stroke={COLORS.neutral}
        strokeWidth="1.5"
      />
      <Path d="M9 20h6" stroke={COLORS.neutral} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function Icon({ action, active }: { action: Action; active?: boolean }) {
  switch (action) {
    case 'undo':
      return <UndoIcon width={size} height={size} />;
    case 'erase':
      return <EraserIcon width={size} height={size} />;
    case 'note':
      return <NoteIcon active={active} />;
    case 'hint':
      return <HintIcon />;
    case 'padmode':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M12 3v3M12 18v3M3 12h3M18 12h3"
            stroke={active ? COLORS.primary : COLORS.neutral}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <Path
            d="M12 8a4 4 0 1 1 0 8a4 4 0 0 1 0-8z"
            stroke={active ? COLORS.primary : COLORS.neutral}
            strokeWidth="2"
            fill="none"
          />
        </Svg>
      );
  }
}

const ActionButton = ({ action, label, active, onPress }: BtnProps) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
      hitSlop={8}
    >
      <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
        <Icon action={action} active={active} />
      </View>
      <Text style={[styles.label, active && styles.activeLabel]}>{label}</Text>
    </Pressable>
  );
};

export default function ActionButtons() {
  const texts = useTexts();
  const noteMode = useSudokuStore(s => s.noteMode ?? false);
  const toggleNoteMode = useSudokuStore(s => s.toggleNoteMode ?? (() => { }));
  const undo = useSudokuStore(s => s.undo);
  const eraseSelected = useSudokuStore(s => s.eraseSelected);
  const padSelectMode = useSudokuStore(s => s.padSelectMode ?? false);
  const togglePadSelectMode = useSudokuStore(s => s.togglePadSelectMode ?? (() => { }));

  const onUndo = () => {
    if (undo) undo();
  };

  const onErase = () => {
    if (eraseSelected) eraseSelected();
  };

  const onNote = () => toggleNoteMode();
  const onHint = () => console.warn('TODO: hint');
  const onPadMode = () => togglePadSelectMode();

  return (
    <View style={styles.row}>
      <ActionButton action="undo" label={texts.game.actions.undo} onPress={onUndo} />
      <ActionButton action="erase" label={texts.game.actions.erase} onPress={onErase} />
      <ActionButton action="hint" label={texts.game.actions.hint} onPress={onHint} />
      <ActionButton action="note" label={texts.game.actions.note} onPress={onNote} active={noteMode} />
      <ActionButton action="padmode" label={texts.game.actions.padMode} onPress={onPadMode} active={padSelectMode} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 6,
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: COLORS.iconBgActive,
  },
  label: {
    marginTop: 4,
    fontSize: 11,
    color: COLORS.label,
  },
  activeLabel: {
    color: COLORS.labelActive,
    fontWeight: '700',
  },
});
