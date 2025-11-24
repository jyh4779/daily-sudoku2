import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TEXTS_EN, TextResources } from '../../../config/texts_en';
import { TEXTS_KO } from '../../../config/texts_ko';

type Language = 'en' | 'ko';

interface LanguageState {
    language: Language;
    texts: TextResources;
    setLanguage: (lang: Language) => void;
}

export const useLanguageStore = create<LanguageState>()(
    persist(
        (set) => ({
            language: 'ko', // Default to Korean as requested
            texts: TEXTS_KO,
            setLanguage: (lang) =>
                set({
                    language: lang,
                    texts: lang === 'ko' ? TEXTS_KO : TEXTS_EN,
                }),
        }),
        {
            name: 'language-storage',
            storage: createJSONStorage(() => AsyncStorage),
            onRehydrateStorage: () => (state) => {
                // Ensure texts are correctly set after rehydration
                if (state) {
                    state.texts = state.language === 'ko' ? TEXTS_KO : TEXTS_EN;
                }
            }
        }
    )
);
