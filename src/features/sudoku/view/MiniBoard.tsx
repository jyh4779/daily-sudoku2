import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';

type Props = {
    size: number;
    values: number[][];
    puzzle: number[][];
    highlight?: { r: number; c: number; value: number };
};

const N = 9;

export default function MiniBoard({ size, values, puzzle, highlight }: Props) {
    // Line thicknesses
    const THIN = 1; // Changed from hairlineWidth to 1 for visibility
    const THICK = 2;
    const LINES_SUM = (THICK * 4) + (THIN * 6);
    const cell = Math.floor((size - LINES_SUM) / N);
    const boardSide = cell * N + LINES_SUM;

    console.log('MiniBoard render:', { size, boardSide, valuesLen: values?.length });

    return (
        <View style={[styles.board, { width: boardSide, height: boardSide }]}>
            {Array.from({ length: N }).map((_, r) => (
                <View key={r} style={styles.row}>
                    {Array.from({ length: N }).map((_, c) => {
                        const v = values[r]?.[c] || 0;
                        const fixed = !!puzzle[r]?.[c];
                        const isTarget = highlight && highlight.r === r && highlight.c === c;

                        // Borders
                        const cellBorder: StyleProp<ViewStyle> = {
                            borderLeftWidth: (c === 0 || c % 3 === 0) ? THICK : THIN,
                            borderTopWidth: (r === 0 || r % 3 === 0) ? THICK : THIN,
                            borderRightWidth: c === N - 1 ? THICK : 0,
                            borderBottomWidth: r === N - 1 ? THICK : 0,
                            borderColor: '#7aa8ff',
                        };

                        return (
                            <View
                                key={c}
                                style={[
                                    styles.cell,
                                    { width: cell, height: cell },
                                    cellBorder,
                                    fixed && styles.fixedCell,
                                    isTarget && styles.targetCell,
                                ]}
                            >
                                {v > 0 ? (
                                    <Text style={[
                                        styles.text,
                                        fixed && styles.fixedText,
                                        isTarget && styles.targetText
                                    ]}>
                                        {v}
                                    </Text>
                                ) : (
                                    isTarget && (
                                        <Text style={[styles.text, styles.targetTextPlaceholder]}>
                                            {highlight.value}
                                        </Text>
                                    )
                                )}
                            </View>
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
        borderWidth: 2,
        borderColor: '#7aa8ff',
        overflow: 'hidden', // Ensure content stays inside
    },
    row: {
        flexDirection: 'row',
        width: '100%', // Ensure row takes full width
    },
    cell: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    fixedCell: { backgroundColor: '#f8f9fa' },
    targetCell: { backgroundColor: '#fff9c4', borderWidth: 0 }, // Light yellow highlight for target

    text: { color: '#4dabf5', fontWeight: '600', fontSize: 14 },
    fixedText: { color: '#2f3b59', fontWeight: '700' },
    targetText: { color: '#f57f17', fontWeight: '900', fontSize: 16 }, // Darker orange/yellow for target number
    targetTextPlaceholder: { color: '#fbc02d', fontWeight: '900', opacity: 0.8 }, // Placeholder for empty target
});
