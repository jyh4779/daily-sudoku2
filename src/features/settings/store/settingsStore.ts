import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SoundManager from '../../../core/audio/SoundManager';

interface SettingsState {
    isBgmEnabled: boolean;
    setBgmEnabled: (enabled: boolean) => void;
    isSfxEnabled: boolean;
    setSfxEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            isBgmEnabled: true,
            setBgmEnabled: (enabled) => {
                SoundManager.setBgmEnabled(enabled);
                set({ isBgmEnabled: enabled });
            },
            isSfxEnabled: true,
            setSfxEnabled: (enabled) => {
                SoundManager.setSfxEnabled(enabled);
                set({ isSfxEnabled: enabled });
            },
        }),
        {
            name: 'settings-storage',
            storage: createJSONStorage(() => AsyncStorage),
            onRehydrateStorage: () => (state) => {
                const effectiveState = state || useSettingsStore.getState();
                if (effectiveState) {
                    SoundManager.setBgmEnabled(effectiveState.isBgmEnabled);
                    SoundManager.setSfxEnabled(effectiveState.isSfxEnabled);
                }
            }
        }
    )
);
