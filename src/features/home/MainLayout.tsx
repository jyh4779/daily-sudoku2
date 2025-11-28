import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, SafeAreaView, Platform } from 'react-native';
import { HomeIcon, DailyIcon, RecordsIcon } from '../../components/Icons';
import HomeScreen from './HomeScreen';
import StatsScreen from '../stats/StatsScreen';
import DailySudokuScreen from '../daily/DailySudokuScreen';
import { useTexts } from '../../config/texts';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { ADMOB_IDS, BANNER_RESERVED_SPACE } from '../../config/admob';

type Tab = 'daily' | 'home' | 'records';

type MainLayoutProps = {
    onPressNewGame: (difficulty: string) => void;
    onPressContinue: () => void;
    onPressSettings: () => void;
    onPressDailyChallenge: () => void;
    continueAvailable: boolean;
    onGoHome: () => void; // Used for back navigation from other screens if needed
};

const MainLayout: React.FC<MainLayoutProps> = ({
    onPressNewGame,
    onPressContinue,
    onPressSettings,
    onPressDailyChallenge,
    continueAvailable,
    onGoHome,
}) => {
    const [activeTab, setActiveTab] = useState<Tab>('home');
    const texts = useTexts();

    const bannerUnitId =
        Platform.select({
            android: ADMOB_IDS.android.banner,
            ios: ADMOB_IDS.ios.banner,
        }) ?? ADMOB_IDS.android.banner;

    const renderContent = () => {
        switch (activeTab) {
            case 'daily':
                return <DailySudokuScreen onPlay={onPressDailyChallenge} />;
            case 'home':
                return (
                    <HomeScreen
                        onPressNewGame={onPressNewGame}
                        onPressContinue={onPressContinue}
                        onPressSettings={onPressSettings}
                        onPressDaily={() => setActiveTab('daily')}
                        continueAvailable={continueAvailable}
                    // Stats button is removed from Home, so we don't pass onPressStats
                    />
                );
            case 'records':
                return <StatsScreen onGoBack={() => setActiveTab('home')} />;
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                {renderContent()}
            </View>

            <SafeAreaView style={styles.bottomBarSafe}>
                <View style={styles.bottomBar}>
                    <TouchableOpacity
                        style={styles.tab}
                        onPress={() => setActiveTab('daily')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.tabIconContainer}>
                            <DailyIcon
                                color={activeTab === 'daily' ? '#5AC8FA' : '#9aa0b8'}
                                size={24}
                            />
                        </View>
                        <Text style={[styles.tabLabel, activeTab === 'daily' && styles.tabLabelActive]}>
                            {texts.tabs.daily}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.tab}
                        onPress={() => setActiveTab('home')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.tabIconContainer}>
                            <HomeIcon
                                color={activeTab === 'home' ? '#5AC8FA' : '#9aa0b8'}
                                size={24}
                            />
                        </View>
                        <Text style={[styles.tabLabel, activeTab === 'home' && styles.tabLabelActive]}>
                            {texts.tabs.home}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.tab}
                        onPress={() => setActiveTab('records')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.tabIconContainer}>
                            <RecordsIcon
                                color={activeTab === 'records' ? '#5AC8FA' : '#9aa0b8'}
                                size={24}
                            />
                        </View>
                        <Text style={[styles.tabLabel, activeTab === 'records' && styles.tabLabelActive]}>
                            {texts.tabs.records}
                        </Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.bannerArea}>
                    <BannerAd
                        unitId={bannerUnitId}
                        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
                    />
                </View>
            </SafeAreaView>
        </View>
    );
};

export default MainLayout;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        flex: 1,
    },
    bottomBarSafe: {
        backgroundColor: 'transparent', // Transparent to let the shadow show and corners work
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    bottomBar: {
        flexDirection: 'row',
        height: 80, // Taller to accommodate the curve and padding
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingBottom: 20, // Push content up a bit
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 10,
    },
    tab: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    tabIconContainer: {
        marginBottom: 6,
    },
    // tabIcon styles removed as they are no longer needed
    tabLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#9aa0b8',
    },
    tabLabelActive: {
        color: '#5AC8FA', // Sky blue color
    },
    bannerArea: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        paddingBottom: Platform.OS === 'ios' ? 0 : 0, // Adjust if needed
    },
});
