import VersionCheck from 'react-native-version-check';
import { Platform } from 'react-native';

export type VersionCheckResult = {
    needsUpdate: boolean;
    storeUrl: string | null;
    currentVersion: string;
    latestVersion: string | null;
};

export const checkAppVersion = async (): Promise<VersionCheckResult> => {
    try {
        const currentVersion = VersionCheck.getCurrentVersion();
        let latestVersion = null;

        // Get latest version from store
        // Note: This might fail if the app is not published yet or package name doesn't match
        try {
            latestVersion = await VersionCheck.getLatestVersion({
                provider: Platform.select({ android: 'playStore', ios: 'appStore' }),
            });
        } catch (e) {
            if (!__DEV__) {
                console.warn('Failed to get latest version from store:', e);
            } else {
                console.log('Skipping version check in DEV mode (store page likely not found)');
            }
        }

        let needsUpdate = false;
        if (latestVersion) {
            needsUpdate = await VersionCheck.needUpdate({
                currentVersion,
                latestVersion,
            }).then(res => res?.isNeeded || false);
        }

        let storeUrl = null;
        if (needsUpdate) {
            try {
                storeUrl = await VersionCheck.getStoreUrl();
            } catch (e) {
                console.warn('Failed to get store URL:', e);
            }
        }

        return {
            needsUpdate,
            storeUrl,
            currentVersion,
            latestVersion,
        };
    } catch (error) {
        console.error('Version check failed:', error);
        return {
            needsUpdate: false,
            storeUrl: null,
            currentVersion: 'unknown',
            latestVersion: null,
        };
    }
};
