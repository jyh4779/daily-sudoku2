import { useEffect, useState } from 'react';
import { Alert, AppState, Linking } from 'react-native';
import mobileAds from 'react-native-google-mobile-ads';
import AppLogger from '../../../core/logger/AppLogger';
import { log } from '../../../core/logger/log';
import { appendFileLog, fileLogPaths } from '../../../core/logger/fileLogger';
import { initGoogleSignin, waitForAuthInit } from '../../../core/auth/AuthRepository';
import SoundManager from '../../../core/audio/SoundManager';
import { checkAppVersion } from '../../../core/version/VersionCheckRepository';
import { useTexts } from '../../../config/texts';

export const useAppBootstrap = () => {
    const texts = useTexts();
    const [isBootstrapped, setIsBootstrapped] = useState(false);
    const [showLoginButtons, setShowLoginButtons] = useState(false);

    useEffect(() => {
        // Initial setup
        AppLogger.init();
        initGoogleSignin();
        void log('APP', 'mounted');
        void mobileAds().initialize();
        void appendFileLog('app mounted', { logFile: fileLogPaths.file });

        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active') {
                SoundManager.resumeBGM();
            } else if (nextAppState === 'background' || nextAppState === 'inactive') {
                SoundManager.pauseBGM();
            }
        });

        return () => {
            subscription.remove();
        };
    }, []);

    const bootstrap = async (onUserCheck: () => Promise<boolean>, onAutoLoginSuccess?: () => void) => {
        // Check for app updates
        const { needsUpdate, storeUrl } = await checkAppVersion();
        if (needsUpdate && storeUrl) {
            Alert.alert(
                texts.common.updateTitle,
                texts.common.updateMessage,
                [
                    {
                        text: texts.common.updateLater,
                        style: 'cancel',
                        onPress: () => continueBootstrap(onUserCheck, onAutoLoginSuccess),
                    },
                    {
                        text: texts.common.updateNow,
                        onPress: () => {
                            Linking.openURL(storeUrl);
                        },
                    },
                ],
                { cancelable: false }
            );
            return;
        }

        await continueBootstrap(onUserCheck, onAutoLoginSuccess);
    };

    const continueBootstrap = async (onUserCheck: () => Promise<boolean>, onAutoLoginSuccess?: () => void) => {
        // Wait for Firebase to restore auth state
        await waitForAuthInit();

        const userLoggedIn = await onUserCheck();

        if (userLoggedIn) {
            setIsBootstrapped(true);
            onAutoLoginSuccess?.();
            return;
        }

        // If no user, show login buttons
        setShowLoginButtons(true);
        setIsBootstrapped(true);
    };

    return {
        isBootstrapped,
        showLoginButtons,
        bootstrap,
    };
};
