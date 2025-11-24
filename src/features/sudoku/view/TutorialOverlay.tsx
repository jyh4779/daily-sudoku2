import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useSudokuStore } from '../viewmodel/sudokuStore';
import { TUTORIAL_STEPS } from '../data/tutorialData';
import { useTexts } from '../../../config/texts';

type Props = {
    onComplete: () => void;
};

const TutorialOverlay: React.FC<Props> = ({ onComplete }) => {
    const [stepIndex, setStepIndex] = useState(0);
    const setTutorialHighlights = useSudokuStore(s => s.setTutorialHighlights);
    const texts = useTexts();

    const currentStep = TUTORIAL_STEPS[stepIndex];
    const isLastStep = stepIndex === TUTORIAL_STEPS.length - 1;

    // Helper to get text for current step
    const getStepText = (index: number) => {
        const key = `step${index + 1}` as keyof typeof texts.tutorial;
        // @ts-ignore - dynamic key access
        const content = texts.tutorial[key];
        return (content as { title: string; text: string }) || { title: '', text: '' };
    };

    const stepContent = getStepText(stepIndex);

    useEffect(() => {
        if (currentStep.highlights) {
            setTutorialHighlights(currentStep.highlights);
        } else {
            setTutorialHighlights(null);
        }
    }, [stepIndex, currentStep, setTutorialHighlights]);

    const handleNext = () => {
        if (isLastStep) {
            setTutorialHighlights(null);
            onComplete();
        } else {
            setStepIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (stepIndex > 0) {
            setStepIndex(prev => prev - 1);
        }
    };

    return (
        <View style={styles.container} pointerEvents="box-none">
            <View style={styles.card}>
                <Text style={styles.stepIndicator}>Step {stepIndex + 1} / {TUTORIAL_STEPS.length}</Text>
                <Text style={styles.title}>{stepContent.title}</Text>
                <Text style={styles.text}>{stepContent.text}</Text>

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.button, styles.secondaryButton, stepIndex === 0 && styles.disabledButton]}
                        onPress={handlePrev}
                        disabled={stepIndex === 0}
                    >
                        <Text style={[styles.buttonText, styles.secondaryButtonText]}>{texts.tutorial.buttons.prev}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleNext}>
                        <Text style={styles.buttonText}>
                            {isLastStep ? texts.tutorial.buttons.complete : texts.tutorial.buttons.next}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'flex-end',
        paddingBottom: 100, // Adjust based on where you want it to float
        alignItems: 'center',
    },
    card: {
        width: '90%',
        maxWidth: 400,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#eee',
    },
    stepIndicator: {
        fontSize: 12,
        color: '#888',
        marginBottom: 4,
        fontWeight: '600',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    text: {
        fontSize: 15,
        color: '#555',
        lineHeight: 22,
        marginBottom: 20,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButton: {
        backgroundColor: '#5b7df6',
    },
    secondaryButton: {
        backgroundColor: '#f0f0f0',
    },
    disabledButton: {
        opacity: 0.5,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
    secondaryButtonText: {
        color: '#666',
    },
});

export default TutorialOverlay;
