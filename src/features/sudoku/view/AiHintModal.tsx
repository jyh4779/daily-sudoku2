import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { useSudokuStore } from '../viewmodel/sudokuStore';
import MiniBoard from './MiniBoard';

const AiHintModal = () => {
    const loading = useSudokuStore(s => s.aiHintLoading);
    const result = useSudokuStore(s => s.aiHintResult);
    const error = useSudokuStore(s => s.aiHintError);
    const clearAiHint = useSudokuStore(s => s.clearAiHint);
    const inputNumber = useSudokuStore(s => s.inputNumber);
    const setSelected = useSudokuStore(s => s.setSelected);
    const values = useSudokuStore(s => s.values);
    const puzzle = useSudokuStore(s => s.puzzle);

    const visible = loading || !!result || !!error;

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

    if (!visible) return null;

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
                                        size={240}
                                        values={values}
                                        puzzle={puzzle}
                                        highlight={{ r: result.r, c: result.c, value: result.value }}
                                    />
                                </View>
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
        maxWidth: 360, // Increased width
        maxHeight: '85%', // Limit height
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
    },
    scrollContent: {
        alignItems: 'center',
        width: '100%',
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#2f3b59',
        marginBottom: 20,
    },
    content: {
        alignItems: 'center',
        marginBottom: 24,
        width: '100%',
    },
    boardContainer: {
        marginBottom: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa', // Add background to verify visibility
        padding: 10,
        borderRadius: 8,
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
        alignSelf: 'stretch', // Ensure full width
    },
    suggestion: {
        backgroundColor: '#f0f4ff',
        padding: 12,
        borderRadius: 8,
        width: '100%',
    },
    suggestionText: {
        fontSize: 14,
        color: '#5b7df6',
        fontWeight: '600',
        textAlign: 'center',
    },
    bold: {
        fontWeight: '800',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
        marginTop: 10,
    },
    btn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
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
});

export default AiHintModal;
