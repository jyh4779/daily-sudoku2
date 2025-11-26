import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTexts } from '../../config/texts';
import { DailyIcon } from '../../components/Icons';

type DailySudokuScreenProps = {
    onPlay?: () => void;
};

const DailySudokuScreen: React.FC<DailySudokuScreenProps> = ({ onPlay }) => {
    const texts = useTexts();

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <DailyIcon size={120} color="#5b7df6" />
                <Text style={styles.title}>{texts.daily.title}</Text>
                <Text style={styles.subtitle}>{texts.daily.subtitle}</Text>

                <TouchableOpacity style={styles.playButton} onPress={onPlay}>
                    <Text style={styles.playButtonText}>{texts.daily.playButton}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default DailySudokuScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fdf8f4',
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 140, // Space for floating tab bar
    },
    content: {
        alignItems: 'center',
        padding: 24,
        gap: 16,
    },
    // icon style removed
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#2f3b59',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#6a7690',
        textAlign: 'center',
        marginBottom: 24,
    },
    playButton: {
        backgroundColor: '#5b7df6',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 16,
        shadowColor: '#5b7df6',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    playButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#ffffff',
    },
});
