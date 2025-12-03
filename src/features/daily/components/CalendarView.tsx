import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronLeftIcon, ChevronRightIcon } from '../../../components/Icons';

type CalendarViewProps = {
    selectedDate: string;
    onSelectDate: (date: string) => void;
    completedDates?: string[]; // List of YYYY-MM-DD
    minDate?: string; // YYYY-MM-DD
};

const CalendarView: React.FC<CalendarViewProps> = ({ selectedDate, onSelectDate, completedDates = [], minDate }) => {
    const [currentMonth, setCurrentMonth] = useState(() => {
        const d = new Date(selectedDate);
        return new Date(d.getFullYear(), d.getMonth(), 1);
    });

    const today = useMemo(() => new Date().toISOString().split('T')[0], []);

    const daysInMonth = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday

        const result = [];
        // Pad empty days
        for (let i = 0; i < firstDay; i++) {
            result.push(null);
        }
        // Add days
        for (let i = 1; i <= days; i++) {
            const date = new Date(year, month, i);
            // Adjust for timezone offset issue when formatting to ISO string locally
            // A simple way to get YYYY-MM-DD correctly in local time:
            const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            result.push(dateString);
        }
        return result;
    }, [currentMonth]);

    const isPrevDisabled = () => {
        if (!minDate) return false;
        const min = new Date(minDate);
        // Compare year and month
        if (currentMonth.getFullYear() < min.getFullYear()) return true;
        if (currentMonth.getFullYear() === min.getFullYear() && currentMonth.getMonth() <= min.getMonth()) return true;
        return false;
    };

    const handlePrevMonth = () => {
        if (isPrevDisabled()) return;
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
        // Prevent going to future months if desired (optional, but usually good for daily puzzles)
        const now = new Date();
        if (nextMonth.getFullYear() > now.getFullYear() || (nextMonth.getFullYear() === now.getFullYear() && nextMonth.getMonth() > now.getMonth())) {
            return;
        }
        setCurrentMonth(nextMonth);
    };

    const isFutureMonth = () => {
        const now = new Date();
        const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
        return nextMonth > now;
    };

    const formatMonthYear = (date: Date) => {
        return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={handlePrevMonth}
                    style={[styles.navButton, isPrevDisabled() && styles.navButtonDisabled]}
                    disabled={isPrevDisabled()}
                >
                    <ChevronLeftIcon size={24} color={isPrevDisabled() ? '#ccc' : '#555'} />
                </TouchableOpacity>
                <Text style={styles.monthTitle}>{formatMonthYear(currentMonth)}</Text>
                <TouchableOpacity
                    onPress={handleNextMonth}
                    style={[styles.navButton, isFutureMonth() && styles.navButtonDisabled]}
                    disabled={isFutureMonth()}
                >
                    <ChevronRightIcon size={24} color={isFutureMonth() ? '#ccc' : '#555'} />
                </TouchableOpacity>
            </View>

            {/* Weekdays */}
            <View style={styles.weekRow}>
                {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                    <Text key={day} style={[styles.weekDayText, index === 0 && styles.sundayText, index === 6 && styles.saturdayText]}>
                        {day}
                    </Text>
                ))}
            </View>

            {/* Days Grid */}
            <View style={styles.daysGrid}>
                {daysInMonth.map((dateString, index) => {
                    if (!dateString) {
                        return <View key={`empty-${index}`} style={styles.dayCell} />;
                    }

                    const isSelected = dateString === selectedDate;
                    const isToday = dateString === today;
                    const isCompleted = completedDates.includes(dateString);
                    const isFuture = dateString > today;

                    return (
                        <TouchableOpacity
                            key={dateString}
                            style={styles.dayCell}
                            onPress={() => !isFuture && onSelectDate(dateString)}
                            disabled={isFuture}
                        >
                            <View style={[
                                styles.dayContent,
                                isSelected && styles.dayContentSelected,
                                isToday && !isSelected && styles.dayContentToday,
                            ]}>
                                <Text style={[
                                    styles.dayText,
                                    isSelected && styles.dayTextSelected,
                                    isToday && !isSelected && styles.dayTextToday,
                                    isFuture && styles.dayTextDisabled,
                                    (index % 7 === 0) && !isSelected && !isToday && !isFuture && styles.sundayText,
                                    (index % 7 === 6) && !isSelected && !isToday && !isFuture && styles.saturdayText,
                                ]}>
                                    {parseInt(dateString.split('-')[2], 10)}
                                </Text>
                            </View>
                            {isCompleted && (
                                <View style={[styles.dot, isSelected && styles.dotSelected]} />
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    monthTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
    },
    navButton: {
        padding: 8,
    },
    navButtonDisabled: {
        opacity: 0.3,
    },
    weekRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    weekDayText: {
        flex: 1,
        textAlign: 'center',
        fontSize: 13,
        color: '#8f96a8',
        fontWeight: '600',
    },
    sundayText: {
        color: '#ff6b6b',
    },
    saturdayText: {
        color: '#5b7df6',
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: '14.28%', // 100% / 7
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 0,
    },
    dayContent: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayContentSelected: {
        backgroundColor: '#5b7df6',
    },
    dayContentToday: {
        backgroundColor: '#eef2f8',
    },
    dayText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    dayTextSelected: {
        color: '#fff',
        fontWeight: '700',
    },
    dayTextToday: {
        color: '#5b7df6',
        fontWeight: '700',
    },
    dayTextDisabled: {
        color: '#ccc',
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#4cd964',
        marginTop: 2,
        position: 'absolute',
        bottom: 4,
    },
    dotSelected: {
        backgroundColor: '#fff',
    },
});

export default CalendarView;
