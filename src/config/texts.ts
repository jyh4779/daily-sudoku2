import { useLanguageStore } from '../features/settings/store/languageStore';
import { TEXTS_EN } from './texts_en';
import { TEXTS_KO } from './texts_ko';

// Deprecated: Direct access is discouraged, use useTexts() hook instead.
// Keeping this for now to avoid breaking everything immediately, 
// but it will be static (English) until refactored.
// Actually, let's make it a getter if possible, or just export the hook.

export { TEXTS_EN } from './texts_en';
export { TEXTS_KO } from './texts_ko';

export const useTexts = () => {
  return useLanguageStore(state => state.texts);
};

// For non-hook usage (less reactive, use with caution)
export const getTexts = () => {
  return useLanguageStore.getState().texts;
};

// Legacy support (temporary) - maps to English to prevent crash
export const TEXTS = TEXTS_EN;
