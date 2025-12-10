import React, { useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, Alert, BackHandler, Switch, ScrollView } from 'react-native';
import { GoogleSigninButton, statusCodes } from '@react-native-google-signin/google-signin';
import { useTexts } from '../../config/texts';
import { signInWithGoogle, signOut, getCurrentUser } from '../../core/auth/AuthRepository';
import { useLanguageStore } from './store/languageStore';
import { useSettingsStore } from './store/settingsStore';
import VersionCheck from 'react-native-version-check';
import { subscribeToUserStats, updateUserNickname } from '../stats/data/StatsRepository';
import { getRandomNickname } from '../../config/nicknames';
import { TextInput } from 'react-native';

type SettingsScreenProps = {
    onGoBack: () => void;
    onUserChanged: () => void;
    onStartTutorial: () => void;
};

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onGoBack, onUserChanged, onStartTutorial }) => {
    const texts = useTexts();
    const { language, setLanguage } = useLanguageStore();
    const { isBgmEnabled, setBgmEnabled, isSfxEnabled, setSfxEnabled } = useSettingsStore();
    const currentUser = getCurrentUser();
    const isAnonymous = currentUser?.isAnonymous ?? true;
    const userId = currentUser?.uid ?? 'Unknown';
    const [isLoading, setIsLoading] = useState(false);
    const [nickname, setNickname] = useState<string>('');
    const [isEditingNickname, setIsEditingNickname] = useState(false);
    const [editNicknameText, setEditNicknameText] = useState('');

    React.useEffect(() => {
        if (currentUser) {
            const unsubscribe = subscribeToUserStats(currentUser.uid, (stats) => {
                if (stats.displayName) {
                    setNickname(stats.displayName);
                }
            });
            return () => unsubscribe();
        }
    }, [currentUser]);

    const handleSaveNickname = async () => {
        if (!currentUser) return;
        if (!editNicknameText.trim()) {
            Alert.alert('Error', 'Nickname cannot be empty');
            return;
        }
        setIsLoading(true);
        try {
            await updateUserNickname(currentUser.uid, editNicknameText.trim());
            setIsEditingNickname(false);
            Alert.alert('Success', 'Nickname updated!');
        } catch (e) {
            Alert.alert('Error', 'Failed to update nickname');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRandomNickname = () => {
        setEditNicknameText(getRandomNickname());
    };

    const startEditingNickname = () => {
        setEditNicknameText(nickname);
        setIsEditingNickname(true);
    };

    React.useEffect(() => {
        const backAction = () => {
            onGoBack();
            return true;
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, [onGoBack]);

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        try {
            await signInWithGoogle();
            onUserChanged();
            Alert.alert(texts.settings.success, texts.settings.linked);
        } catch (error: any) {
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                console.log('Google Sign-In cancelled');
                // No need to alert the user
            } else {
                console.error('Google Sign-In failed', error);
                Alert.alert(texts.settings.loginFailed, texts.settings.loginFailedMsg);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignOut = async () => {
        setIsLoading(true);
        try {
            await signOut();
            onUserChanged();
            Alert.alert(texts.settings.loggedOut, texts.settings.loggedOutMsg, [
                { text: 'OK', onPress: () => BackHandler.exitApp() },
            ]);
        } catch (error) {
            console.error('Sign out failed', error);
            Alert.alert(texts.settings.error, texts.settings.signOutFailed);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyPuzzles = async () => {
        setIsLoading(true);
        try {
            const { getApp } = require('@react-native-firebase/app');
            const { getFirestore, collection, query, where, limit, getDocs } = require('@react-native-firebase/firestore');

            const app = getApp();
            const db = getFirestore(app);
            const puzzlesRef = collection(db, 'puzzles');
            const q = query(puzzlesRef, where('difficulty', '==', 'easy'), limit(5));

            const snapshot = await getDocs(q);
            console.log('--- VERIFY EASY PUZZLES ---');
            snapshot.forEach((doc: any) => {
                const data = doc.data();
                console.log(`ID: ${doc.id}`);
                console.log(`Board: ${data.board}`);
                console.log(`Solution: ${data.solution}`);
                console.log('---------------------------');
            });
            Alert.alert('Verification', 'Checked 5 puzzles. See console logs.');
        } catch (error) {
            console.error('Verify failed', error);
            Alert.alert('Error', 'Failed to verify puzzles');
        } finally {
            setIsLoading(false);
        }
    };
    const handleAnalyzeAndMigratePuzzles = async () => {
        setIsLoading(true);
        try {
            const { getApp } = require('@react-native-firebase/app');
            const { getFirestore, collection, getDocs, updateDoc, doc } = require('@react-native-firebase/firestore');
            const { SudokuLogicSolver } = require('../../utils/SudokuLogicSolver');

            const app = getApp();
            const db = getFirestore(app);
            const puzzlesRef = collection(db, 'puzzles');

            const snapshot = await getDocs(puzzlesRef);

            console.log(`--- STARTING LOGIC ANALYSIS OF ${snapshot.size} PUZZLES ---`);

            let migratedCount = 0;
            let mismatchCount = 0;
            const updates: Promise<void>[] = [];

            snapshot.forEach((document: any) => {
                const data = document.data();
                const currentDiff = data.difficulty;
                const board = data.board;

                if (!board || typeof board !== 'string') return;

                // Use Logic Solver
                const solver = new SudokuLogicSolver(board);
                const result = solver.solveAndGrade();
                const calculatedDiff = result.difficulty;

                if (currentDiff === 'hell') {
                    console.log(`[MIGRATE] Doc ${document.id} : hell -> expert (Logic says: ${calculatedDiff})`);
                    updates.push(updateDoc(doc(db, 'puzzles', document.id), { difficulty: 'expert' }));
                    migratedCount++;
                }
                else if (currentDiff !== calculatedDiff) {
                    const isMinorMismatch = (currentDiff === 'beginner' && calculatedDiff === 'easy');

                    if (!isMinorMismatch) {
                        console.log(`[MISMATCH] Doc ${document.id} : Current=${currentDiff}, Logic=${calculatedDiff}`);
                        mismatchCount++;
                    }
                }
            });

            await Promise.all(updates);

            const resultMsg = `Logic Analysis Complete.\nScanned: ${snapshot.size}\nMigrated (hell->expert): ${migratedCount}\nMismatches: ${mismatchCount}\n(Check console)`;
            console.log(resultMsg);
            Alert.alert('Analysis Complete', resultMsg);

        } catch (error) {
            console.error('Analysis failed', error);
            Alert.alert('Error', 'Failed to analyze puzzles');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={onGoBack} activeOpacity={0.8}>
                    <Text style={styles.backIcon}>{'<'}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{texts.settings.title}</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{texts.settings.language}</Text>
                    <View style={styles.card}>
                        <View style={styles.langRow}>
                            <TouchableOpacity
                                style={[styles.langButton, language === 'ko' && styles.langButtonActive]}
                                onPress={() => setLanguage('ko')}
                            >
                                <Text style={[styles.langText, language === 'ko' && styles.langTextActive]}>한국어</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.langButton, language === 'en' && styles.langButtonActive]}
                                onPress={() => setLanguage('en')}
                            >
                                <Text style={[styles.langText, language === 'en' && styles.langTextActive]}>English</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Sound</Text>
                    <View style={styles.card}>
                        <View style={styles.row}>
                            <Text style={styles.label}>{texts.settings.bgm}</Text>
                            <Switch
                                value={isBgmEnabled}
                                onValueChange={setBgmEnabled}
                                trackColor={{ false: '#d0d0d0', true: '#5b7df6' }}
                                thumbColor={isBgmEnabled ? '#fff' : '#f4f3f4'}
                            />
                        </View>
                        <View style={[styles.row, { marginTop: 12 }]}>
                            <Text style={styles.label}>{texts.settings.sfx}</Text>
                            <Switch
                                value={isSfxEnabled}
                                onValueChange={setSfxEnabled}
                                trackColor={{ false: '#d0d0d0', true: '#5b7df6' }}
                                thumbColor={isSfxEnabled ? '#fff' : '#f4f3f4'}
                            />
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Help</Text>
                    <TouchableOpacity style={styles.card} onPress={onStartTutorial}>
                        <Text style={styles.label}>How to Play (Tutorial)</Text>
                    </TouchableOpacity>
                </View>

                {/* <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Debug</Text>
                    <TouchableOpacity style={styles.card} onPress={async () => {
                        if (!currentUser) return;
                        Alert.alert(
                            'Clean Up Data',
                            'This will delete all game records with 0 seconds duration and recalculate your stats. This cannot be undone.',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Clean Up',
                                    style: 'destructive',
                                    onPress: async () => {
                                        setIsLoading(true);
                                        try {
                                            const { cleanupInvalidGames } = require('../stats/data/StatsRepository');
                                            const count = await cleanupInvalidGames(currentUser.uid);
                                            Alert.alert('Success', `Deleted ${count} invalid games and updated stats.`);
                                        } catch (e) {
                                            Alert.alert('Error', 'Failed to clean up data');
                                            console.error(e);
                                        } finally {
                                            setIsLoading(false);
                                        }
                                    }
                                }
                            ]
                        );
                    }}>
                        <Text style={styles.label}>Clean Up Invalid Data (0s games)</Text>
                    </TouchableOpacity>
                </View> */}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{texts.settings.account}</Text>
                    <View style={styles.card}>
                        <Text style={styles.label}>Nickname:</Text>
                        {isEditingNickname ? (
                            <View style={styles.editNicknameRow}>
                                <TextInput
                                    style={styles.nicknameInput}
                                    value={editNicknameText}
                                    onChangeText={setEditNicknameText}
                                    placeholder="Enter nickname"
                                    maxLength={20}
                                />
                                <View style={styles.editNicknameActions}>
                                    <TouchableOpacity style={styles.smallBtn} onPress={handleRandomNickname}>
                                        <Text style={styles.smallBtnText}>Random</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.smallBtn, styles.saveBtn]} onPress={handleSaveNickname}>
                                        <Text style={[styles.smallBtnText, styles.saveBtnText]}>Save</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.smallBtn, styles.cancelBtn]} onPress={() => setIsEditingNickname(false)}>
                                        <Text style={styles.smallBtnText}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.nicknameRow}>
                                <Text style={styles.value}>{nickname || 'Loading...'}</Text>
                                <TouchableOpacity style={styles.smallBtn} onPress={startEditingNickname}>
                                    <Text style={styles.smallBtnText}>Edit</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <Text style={styles.label}>{texts.settings.userId}:</Text>
                        <Text style={styles.value}>{userId}</Text>
                        <Text style={styles.label}>{texts.settings.type}:</Text>
                        <Text style={styles.value}>{isAnonymous ? texts.settings.guest : texts.settings.google}</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Info</Text>
                    <View style={styles.card}>
                        <Text style={styles.label}>Version:</Text>
                        <Text style={styles.value}>{VersionCheck.getCurrentVersion()}</Text>
                    </View>
                </View>

                <View style={styles.actions}>
                    {isAnonymous ? (
                        <View style={styles.actionRow}>
                            <Text style={styles.actionDesc}>{texts.settings.linkGoogle}</Text>
                            <GoogleSigninButton
                                size={GoogleSigninButton.Size.Wide}
                                color={GoogleSigninButton.Color.Dark}
                                onPress={handleGoogleSignIn}
                                disabled={isLoading}
                                style={styles.googleButton}
                            />
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} disabled={isLoading}>
                            <Text style={styles.signOutText}>{texts.settings.signOut}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default SettingsScreen;

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#fff6ea',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 50,
        paddingBottom: 12,
    },
    backButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffe8d2',
    },
    backIcon: {
        fontSize: 18,
        fontWeight: '700',
        color: '#5c4b33',
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 20,
        fontWeight: '700',
        color: '#3a2f1e',
    },
    headerSpacer: {
        width: 32,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 24,
        gap: 32,
        paddingBottom: 40,
    },
    section: {
        gap: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#3d2a17',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#d0a67b',
        shadowOpacity: 0.1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
        gap: 8,
    },
    label: {
        fontSize: 14,
        color: '#9e9384',
    },
    value: {
        fontSize: 16,
        color: '#2f2010',
        fontWeight: '600',
        marginBottom: 8,
    },
    actions: {
        alignItems: 'center',
        gap: 16,
    },
    actionRow: {
        alignItems: 'center',
        gap: 12,
        width: '100%',
    },
    actionDesc: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 8,
    },
    googleButton: {
        width: '100%',
        height: 48,
    },
    signOutButton: {
        width: '100%',
        height: 48,
        backgroundColor: '#ff6b6b',
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    signOutText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    langRow: {
        flexDirection: 'row',
        gap: 12,
    },
    langButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        alignItems: 'center',
    },
    langButtonActive: {
        backgroundColor: '#5b7df6',
        borderColor: '#5b7df6',
    },
    langText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
    },
    langTextActive: {
        color: '#fff',
    },
    nicknameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    editNicknameRow: {
        gap: 8,
        marginBottom: 8,
    },
    nicknameInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 16,
        color: '#333',
        backgroundColor: '#f9f9f9',
    },
    editNicknameActions: {
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'flex-end',
    },
    smallBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: '#eee',
        alignItems: 'center',
        justifyContent: 'center',
    },
    smallBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#555',
    },
    saveBtn: {
        backgroundColor: '#5b7df6',
    },
    saveBtnText: {
        color: '#fff',
    },
    cancelBtn: {
        backgroundColor: '#ff6b6b',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
});
