import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { getDailyChallengeLeaderboard } from '../stats/data/StatsRepository';
import { getCurrentUser } from '../../core/auth/AuthRepository';
import { useTexts } from '../../config/texts';
import CalendarView from './components/CalendarView';
import { useSudokuStore } from '../sudoku/viewmodel/sudokuStore';

type DailySudokuScreenProps = {
    onPlay: (date: string) => void;
};

const DailySudokuScreen: React.FC<DailySudokuScreenProps> = ({ onPlay }) => {
    const texts = useTexts();
    const [loading, setLoading] = useState(true);
    const [todayCompleted, setTodayCompleted] = useState(false);

    // Calendar State
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [completedDates, setCompletedDates] = useState<string[]>([]); // To be implemented properly later

    const setDailyDate = useSudokuStore(state => state.setDailyDate);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const user = getCurrentUser();
            if (user) {
                // Check if completed for SELECTED DATE
                // We still fetch leaderboard to check if user completed it.
                // Optimization: In future, use a dedicated "checkCompletion" API.
                const lb = await getDailyChallengeLeaderboard(selectedDate, 100);
                const myEntry = lb.find((item: any) => item.userId === user.uid);
                setTodayCompleted(!!myEntry);

                // TODO: Fetch completed dates for calendar dots
            }
        } catch (e) {
            console.error('Failed to load daily data', e);
        } finally {
            setLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleStartDaily = () => {
        setDailyDate(selectedDate);
        onPlay(selectedDate);
    };

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{texts.daily.title}</Text>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                {/* Calendar Section - Always Visible */}
                <View style={styles.calendarSection}>
                    <CalendarView
                        selectedDate={selectedDate}
                        onSelectDate={(date) => setSelectedDate(date)}
                        completedDates={completedDates}
                        minDate="2025-11-01"
                    />
                </View>

                {/* Action Section */}
                <View style={styles.actionContainer}>
                    <Text style={styles.dateLabel}>{selectedDate === new Date().toISOString().split('T')[0] ? 'Today' : selectedDate}</Text>
                    {loading ? (
                        <ActivityIndicator color="#5b7df6" />
                    ) : todayCompleted ? (
                        <View style={styles.completedBadge}>
                            <Text style={styles.completedText}>{texts.game.overlayTitle.success}</Text>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.playButton} onPress={handleStartDaily}>
                            <Text style={styles.playButtonText}>{texts.daily.playButton}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#f8f9fd',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 12,
        backgroundColor: '#fff',
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    calendarSection: {
        marginBottom: 20,
    },
    actionContainer: {
        alignItems: 'center',
        marginBottom: 40,
        backgroundColor: '#fff',
        padding: 24,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    dateLabel: {
        fontSize: 16,
        color: '#555',
        marginBottom: 16,
        fontWeight: '600',
    },
    playButton: {
        backgroundColor: '#5b7df6',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 30,
        width: '100%',
        alignItems: 'center',
    },
    playButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    completedBadge: {
        backgroundColor: '#4cd964',
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 30,
    },
    completedText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default DailySudokuScreen;
