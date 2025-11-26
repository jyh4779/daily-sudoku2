import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useSudokuStore } from '../viewmodel/sudokuStore';

const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function NumberPad() {
	const inputNumber = useSudokuStore(s => s.inputNumber);
	const noteMode = useSudokuStore(s => s.noteMode ?? false);
	const toggleNoteAtSelected = useSudokuStore(s => s.toggleNoteAtSelected);
	const values = useSudokuStore(s => s.values);
	const padSelectMode = useSudokuStore(s => s.padSelectMode ?? false);
	const selectedPad = useSudokuStore(s => s.selectedPad ?? null);
	const setSelectedPad = useSudokuStore(s => s.setSelectedPad ?? (() => { }));

	const counts = React.useMemo(() => {
		const acc = Array(10).fill(0) as number[];
		for (const row of values) {
			for (const v of row) {
				if (v >= 1 && v <= 9) acc[v]++;
			}
		}
		return acc; // counts[1..9]
	}, [values]);

	// Auto-advance selectedPad when its count reaches 9 in pad-select mode
	React.useEffect(() => {
		if (!padSelectMode || !selectedPad) return;
		if (counts[selectedPad] < 9) return;
		// find next available number with count < 9
		for (let step = 1; step <= 9; step++) {
			const n2 = ((selectedPad - 1 + step) % 9) + 1; // wrap 1..9
			if (counts[n2] < 9) {
				setSelectedPad(n2);
				return;
			}
		}
		// if none available, clear selection
		setSelectedPad(null);
	}, [counts, padSelectMode, selectedPad, setSelectedPad]);

	return (
		<View style={styles.pad}>
			{nums.map(n => (
				<Pressable
					key={n}
					android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: false }}
					style={({ pressed }) => [
						styles.key,
						selectedPad === n && padSelectMode && styles.keySelected,
						counts[n] >= 9 && styles.keyDisabled,
						Platform.OS === 'ios' && pressed && counts[n] < 9 && { opacity: 0.8 }
					]}
					disabled={counts[n] >= 9}
					onPress={() => {
						if (padSelectMode) {
							setSelectedPad(selectedPad === n ? null : n);
							return;
						}
						if (noteMode) {
							if (toggleNoteAtSelected) toggleNoteAtSelected(n);
						} else {
							inputNumber(n);
						}
					}}
				>
					<Text style={[styles.keyText, counts[n] >= 9 && styles.keyTextDisabled, selectedPad === n && padSelectMode && styles.keyTextSelected]}>{n}</Text>
					{counts[n] < 9 && (
						<Text style={[styles.remainingText, selectedPad === n && padSelectMode && styles.remainingTextSelected]}>
							{9 - counts[n]}
						</Text>
					)}
				</Pressable>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	pad: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: 6
	},
	key: {
		flex: 1,
		height: 52,
		borderRadius: 12,
		backgroundColor: '#e0ebff',
		justifyContent: 'center',
		alignItems: 'center',
		elevation: 2,
		shadowColor: '#000',
		shadowOpacity: 0.06,
		shadowRadius: 4,
		shadowOffset: { width: 0, height: 2 }
	},
	keySelected: {
		backgroundColor: '#f9cfe5',
	},
	keyDisabled: {
		backgroundColor: '#f5f5f5',
		elevation: 0,
		shadowOpacity: 0,
	},
	keyText: { fontSize: 18, fontWeight: '700', color: '#2f3b59', marginBottom: -2 },
	keyTextSelected: { color: '#2f3b59' },
	keyTextDisabled: { color: '#b2b8c7' },
	remainingText: { fontSize: 10, color: '#8f96a8', fontWeight: '600' },
	remainingTextSelected: { color: '#5b7df6' }
});
