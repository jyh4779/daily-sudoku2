import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';

type Props = {
    size: number;
    values: number[][];
    puzzle: number[][];
    highlight?: { r: number; c: number; value: number };
    relatedCells?: number[];
    relatedRegions?: { type: 'row' | 'col' | 'box'; index: number }[];
};

const N = 9;

export default function MiniBoard({ size, values, puzzle, highlight, relatedCells, relatedRegions }: Props) {
    // Design constants based on the reference image
    const BORDER_COLOR = '#8da4f7'; // Soft blue for grid lines
    const OUTER_BORDER_COLOR = '#5b7df6'; // Stronger blue for outer border
    const HIGHLIGHT_BG = '#fff59d'; // Yellow for target cell
    const RELATED_CELL_BG = '#ffcdd2'; // Red for related cells (e.g. pair members)
    const RELATED_REGION_BG = '#ffebee'; // Light red for related regions
    const FIXED_TEXT_COLOR = '#2f3b59'; // Dark for fixed numbers
    const INPUT_TEXT_COLOR = '#5b7df6'; // Blue for user inputs
    const TARGET_TEXT_COLOR = '#5b7df6'; // Blue for the hint number

    const THIN = 1;
    const THICK = 2;
    const LINES_SUM = (THICK * 4) + (THIN * 6);
    const cell = Math.floor((size - LINES_SUM) / N);
    const boardSide = cell * N + LINES_SUM;

    return (
        <View style={[styles.board, { width: boardSide, height: boardSide, borderColor: OUTER_BORDER_COLOR }]}>
            {Array.from({ length: N }).map((_, r) => (
                <View key={r} style={styles.row}>
                    {Array.from({ length: N }).map((_, c) => {
                        const v = values[r]?.[c] || 0;
                        const fixed = !!puzzle[r]?.[c];
                        const isTarget = highlight && highlight.r === r && highlight.c === c;
                        const cellIdx = r * 9 + c;

                        // Check if cell is in related region
                        let isRelatedRegion = false;
                        if (relatedRegions) {
                            for (const region of relatedRegions) {
                                if (region.type === 'row' && region.index === r) isRelatedRegion = true;
                                if (region.type === 'col' && region.index === c) isRelatedRegion = true;
                                if (region.type === 'box') {
                                    const boxIdx = Math.floor(r / 3) * 3 + Math.floor(c / 3);
                                    if (region.index === boxIdx) isRelatedRegion = true;
                                }
                            }
                        }

                        // Check if cell is a related cell
                        const isRelatedCell = relatedCells?.includes(cellIdx);

                        // Determine background color
                        let bgColor = '#fff';
                        if (isTarget) bgColor = HIGHLIGHT_BG;
                        else if (isRelatedCell) bgColor = RELATED_CELL_BG;
                        else if (isRelatedRegion) bgColor = RELATED_REGION_BG;

                        // Borders logic
                        const borderLeft = (c === 0 || c % 3 === 0) ? THICK : THIN;
                        const borderTop = (r === 0 || r % 3 === 0) ? THICK : THIN;
                        const borderRight = c === N - 1 ? THICK : 0;
                        const borderBottom = r === N - 1 ? THICK : 0;

                        const cellStyle: StyleProp<ViewStyle> = {
                            width: cell,
                            height: cell,
                            borderLeftWidth: borderLeft,
                            borderTopWidth: borderTop,
                            borderRightWidth: borderRight,
                            borderBottomWidth: borderBottom,
                            borderColor: BORDER_COLOR,
                            backgroundColor: bgColor,
                        };

                        return (
                            <View key={c} style={[styles.cell, cellStyle]}>
                                {v > 0 ? (
                                    <Text style={[
                                        styles.text,
                                        { color: fixed ? FIXED_TEXT_COLOR : INPUT_TEXT_COLOR },
                                        isTarget && { fontWeight: 'bold', color: TARGET_TEXT_COLOR }
                                    ]}>
                                        {v}
                                    </Text>
                                ) : (
                                    isTarget && (
                                        <Text style={[styles.text, { color: TARGET_TEXT_COLOR, opacity: 0.6 }]}>
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
        borderWidth: 2, // Outer border thickness
        // borderColor set in inline style
    },
    row: {
        flexDirection: 'row',
    },
    cell: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontSize: 18,
        fontWeight: '600',
    },
});
