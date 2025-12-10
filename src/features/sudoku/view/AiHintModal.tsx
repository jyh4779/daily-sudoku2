import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ActivityIndicator, ScrollView, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useSudokuStore } from '../viewmodel/sudokuStore';
import MiniBoard from './MiniBoard';
import { useTexts } from '../../../config/texts';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const AiHintModal = () => {
    const texts = useTexts();
    const loading = useSudokuStore(s => s.aiHintLoading);
    const result = useSudokuStore(s => s.aiHintResult);
    const error = useSudokuStore(s => s.aiHintError);
    const clearAiHint = useSudokuStore(s => s.clearAiHint);
    const inputNumber = useSudokuStore(s => s.inputNumber);
    const setSelected = useSudokuStore(s => s.setSelected);
    const values = useSudokuStore(s => s.values);
    const puzzle = useSudokuStore(s => s.puzzle);

    const [showDescription, setShowDescription] = useState(false);

    const visible = loading || !!result || !!error;

    useEffect(() => {
        if (!visible) {
            setShowDescription(false);
        }
    }, [visible]);

    const handleClose = () => {
        clearAiHint();
    };

    const handleApply = () => {
        if (result) {
            setSelected({ r: result.r, c: result.c });
            inputNumber(result.value);
            clearAiHint();
        }
    };

    const toggleDescription = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowDescription(!showDescription);
    };

    const getTechniqueInfo = (key: string) => {
        const techMap: Record<string, keyof typeof texts.game.techniques> = {
            'Naked Single': 'nakedSingle',
            'Hidden Single': 'hiddenSingle',
            'Naked Pair': 'nakedPair',
            'Naked Triple': 'nakedTriple',
            'Hidden Pair': 'hiddenPair',
            'Hidden Triple': 'hiddenTriple',
            'Pointing': 'pointing',
            'Claiming': 'claiming',
            'X-Wing': 'xWing',
            'Y-Wing': 'yWing',
        };
        const techKey = techMap[key];
        return techKey ? texts.game.techniques[techKey] : null;
    };

    if (!visible) return null;

    const techInfo = result?.techniqueKey ? getTechniqueInfo(result.techniqueKey) : null;

    return (
        <Modal transparent animationType="fade" visible={visible} onRequestClose={handleClose}>
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <Text style={styles.title}>AI Hint</Text>

                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        {loading && (
                            <View style={styles.content}>
                                <ActivityIndicator size="large" color="#5b7df6" />
                                <Text style={styles.text}>Analyzing board...</Text>
                            </View>
                        )}

                        {error && (
                            <View style={styles.content}>
                                <Text style={[styles.text, styles.error]}>{error}</Text>
                            </View>
                        )}

                        {result && values && puzzle && (
                            <View style={styles.content}>
                                <View style={styles.boardContainer}>
                                    <MiniBoard
                                        size={260}
                                        values={values}
                                        puzzle={puzzle}
                                        highlight={{ r: result.r, c: result.c, value: result.value }}
                                        relatedCells={result.relatedCells}
                                        relatedRegions={result.relatedRegions}
                                    />
                                </View>

                                {result.technique && (
                                    <Pressable
                                        style={[styles.techniqueBadge, showDescription && styles.techniqueBadgeActive]}
                                        onPress={toggleDescription}
                                    >
                                        <Text style={[styles.techniqueText, showDescription && styles.techniqueTextActive]}>
                                            {result.technique} ⓘ
                                        </Text>
                                    </Pressable>
                                )}

                                {showDescription && techInfo && (
                                    <View style={styles.descriptionBox}>
                                        <Text style={styles.descriptionTitle}>{techInfo.name}</Text>
                                        <Text style={styles.descriptionText}>{techInfo.desc}</Text>
                                    </View>
                                )}

                                <Text style={styles.reasoning}>{result.reasoning}</Text>

                                <View style={styles.suggestion}>
                                    <Text style={styles.suggestionText}>
                                        Suggestion: Place <Text style={styles.bold}>{result.value}</Text> at Row {result.r + 1}, Col {result.c + 1}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </ScrollView>

                    <View style={styles.actions}>
                        <Pressable style={[styles.btn, styles.btnClose]} onPress={handleClose}>
                            <Text style={styles.btnTextClose}>Close</Text>
                        </Pressable>
                        {result && (
                            <Pressable style={[styles.btn, styles.btnApply]} onPress={handleApply}>
                                <Text style={styles.btnTextApply}>Apply</Text>
                            </Pressable>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        width: '100%',
        maxWidth: 360,
        maxHeight: '90%',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
    },
    scrollContent: {
        alignItems: 'center',
        width: '100%',
        paddingBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: '#2f3b59',
        marginBottom: 20,
    },
    content: {
        alignItems: 'center',
        width: '100%',
    },
    boardContainer: {
        marginBottom: 20,
        alignItems: 'center',
        justifyContent: 'center',
        // backgroundColor: '#f8f9fa', // Removed background to look cleaner
        // padding: 10,
        // borderRadius: 8,
    },
    text: {
        fontSize: 16,
        color: '#6f768f',
        textAlign: 'center',
        marginTop: 12,
    },
    error: {
        color: '#ff4d4d',
    },
    reasoning: {
        fontSize: 15,
        color: '#4a5568',
        lineHeight: 22,
        textAlign: 'left',
        marginBottom: 16,
        alignSelf: 'stretch',
    },
    suggestion: {
        backgroundColor: '#f0f4ff',
        padding: 16,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
    },
    suggestionText: {
        fontSize: 15,
        color: '#5b7df6',
        fontWeight: '600',
        textAlign: 'center',
    },
    bold: {
        fontWeight: '800',
        fontSize: 16,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
        marginTop: 10,
    },
    btn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnClose: {
        backgroundColor: '#f1f5f9',
    },
    btnApply: {
        backgroundColor: '#5b7df6',
    },
    btnTextClose: {
        fontSize: 16,
        fontWeight: '600',
        color: '#64748b',
    },
    btnTextApply: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    techniqueBadge: {
        backgroundColor: '#e0e7ff',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 12,
        alignSelf: 'flex-start',
    },
    techniqueBadgeActive: {
        backgroundColor: '#4338ca',
    },
    techniqueText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#4338ca',
    },
    techniqueTextActive: {
        color: '#fff',
    },
    descriptionBox: {
        backgroundColor: '#f8fafc',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        width: '100%',
        borderLeftWidth: 4,
        borderLeftColor: '#4338ca',
    },
    descriptionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#2f3b59',
        marginBottom: 4,
    },
    descriptionText: {
        fontSize: 14,
        color: '#64748b',
        lineHeight: 20,
    },
});

export default AiHintModal;
