import { useState } from 'react';
import { Alert } from 'react-native';
import { statusCodes } from '@react-native-google-signin/google-signin';
import { signInWithGoogle as googleSignIn, signInAnonymously as guestSignIn, getCurrentUser } from '../../../core/auth/AuthRepository';
import { saveGameResult, syncDailyStreak } from '../../stats/data/StatsRepository';
import { appendFileLog } from '../../../core/logger/fileLogger';

export type UserType = 'guest' | 'google';
export type AppUser = { type: UserType; id: string; name?: string | null };

export const useGoogleAuth = () => {
    const [user, setUser] = useState<AppUser | null>(null);
    const [isSigningIn, setIsSigningIn] = useState(false);

    const updateUserState = async (): Promise<boolean> => {
        const currentUser = getCurrentUser();
        if (currentUser) {
            const type = currentUser.isAnonymous ? 'guest' : 'google';
            setUser({ type, id: currentUser.uid, name: currentUser.displayName });
            await appendFileLog('user state updated', { uid: currentUser.uid, type });

            // Sync streak if user exists
            await syncDailyStreak(currentUser.uid);
            return true;
        } else {
            setUser(null);
            return false;
        }
    };

    const handleGoogleSignIn = async (onSuccess?: () => void) => {
        setIsSigningIn(true);
        try {
            const googleUser = await googleSignIn();
            setUser({ type: 'google', id: googleUser.uid, name: googleUser.displayName });
            onSuccess?.();
        } catch (error: any) {
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                console.log('Google Sign-In cancelled');
            } else {
                console.error('Google Sign-In failed', error);
                Alert.alert('Login Failed', 'Could not sign in with Google.');
            }
        } finally {
            setIsSigningIn(false);
        }
    };

    const handleGuestContinue = async (onSuccess?: () => void) => {
        setIsSigningIn(true);
        try {
            const anonUser = await guestSignIn();
            setUser({ type: 'guest', id: anonUser.uid });
            await appendFileLog('anonymous user created', { uid: anonUser.uid });
            onSuccess?.();
        } catch (error) {
            console.warn('Failed to sign in anonymously', error);
            Alert.alert('Error', 'Could not sign in as guest.');
        } finally {
            setIsSigningIn(false);
        }
    };

    return {
        user,
        isSigningIn,
        updateUserState,
        handleGoogleSignIn,
        handleGuestContinue,
    };
};
