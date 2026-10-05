import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { SupportedLanguage, LanguagePreference } from '../types';
import { TranslationKey } from '../i18n/types';
import {
  TRANSLATIONS_ES,
  TRANSLATIONS_EN,
  CONTINENT_TRANSLATIONS,
  ACHIEVEMENT_TRANSLATIONS,
} from '../i18n/translations';
import { COUNTRY_TRANSLATIONS_EN } from '../i18n/countriesEn';

const LANGUAGE_STORAGE_KEY = '@flagspp_language_preference_v1';

export const detectSystemLanguage = (): SupportedLanguage => {
  try {
    const locales = getLocales();
    if (locales && locales.length > 0) {
      const primary = locales[0];
      const langCode = primary.languageCode?.toLowerCase() || '';
      if (langCode.startsWith('en')) {
        return 'en';
      }
    }
  } catch {
    // Non-critical fallback
  }
  return 'es';
};

interface LanguageContextType {
  language: SupportedLanguage;
  languagePreference: LanguagePreference;
  setLanguagePreference: (preference: LanguagePreference) => Promise<void>;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  getCountryName: (code: string, fallbackName?: string) => string;
  getCapitalName: (code: string, fallbackCapital?: string) => string;
  getCountryFact: (code: string, fallbackFact?: string) => string;
  getContinentName: (continent: string) => string;
  getAchievementInfo: (
    id: string,
    fallbackTitle: string,
    fallbackDesc: string
  ) => { title: string; description: string };
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'es',
  languagePreference: 'system',
  setLanguagePreference: async () => {},
  t: (key) => key,
  getCountryName: (_, fallback = '') => fallback,
  getCapitalName: (_, fallback = '') => fallback,
  getCountryFact: (_, fallback = '') => fallback,
  getContinentName: (c) => c,
  getAchievementInfo: (_, fallbackTitle, fallbackDesc) => ({
    title: fallbackTitle,
    description: fallbackDesc,
  }),
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [languagePreference, setLanguagePreferenceState] = useState<LanguagePreference>('system');
  const [systemLanguage, setSystemLanguage] = useState<SupportedLanguage>('es');

  useEffect(() => {
    // Detect system language
    const detected = detectSystemLanguage();
    setSystemLanguage(detected);

    // Load stored preference
    const loadStoredLang = async () => {
      try {
        const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (stored === 'system' || stored === 'es' || stored === 'en') {
          setLanguagePreferenceState(stored);
        }
      } catch {
        // Fallback to system default
      }
    };
    loadStoredLang();
  }, []);

  const setLanguagePreference = async (newPref: LanguagePreference) => {
    setLanguagePreferenceState(newPref);
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newPref);
    } catch {}
  };

  const language: SupportedLanguage = useMemo(() => {
    if (languagePreference === 'es') return 'es';
    if (languagePreference === 'en') return 'en';
    return systemLanguage;
  }, [languagePreference, systemLanguage]);

  const dictionary = useMemo(() => {
    return language === 'en' ? TRANSLATIONS_EN : TRANSLATIONS_ES;
  }, [language]);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      let str = dictionary[key] || TRANSLATIONS_ES[key] || key;
      if (params) {
        Object.entries(params).forEach(([paramKey, val]) => {
          str = str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
        });
      }
      return str;
    },
    [dictionary]
  );

  const getCountryName = useCallback(
    (code: string, fallbackName: string = ''): string => {
      if (language === 'en') {
        const enCountry = COUNTRY_TRANSLATIONS_EN[code.toLowerCase()];
        if (enCountry?.name) return enCountry.name;
      }
      return fallbackName;
    },
    [language]
  );

  const getCapitalName = useCallback(
    (code: string, fallbackCapital: string = ''): string => {
      if (language === 'en') {
        const enCountry = COUNTRY_TRANSLATIONS_EN[code.toLowerCase()];
        if (enCountry?.capital) return enCountry.capital;
      }
      return fallbackCapital;
    },
    [language]
  );

  const getCountryFact = useCallback(
    (code: string, fallbackFact: string = ''): string => {
      if (language === 'en') {
        const enCountry = COUNTRY_TRANSLATIONS_EN[code.toLowerCase()];
        if (enCountry?.fact) return enCountry.fact;
      }
      return fallbackFact;
    },
    [language]
  );

  const getContinentName = useCallback(
    (continent: string): string => {
      const match = CONTINENT_TRANSLATIONS[continent];
      if (match) {
        return language === 'en' ? match.en : match.es;
      }
      return continent;
    },
    [language]
  );

  const getAchievementInfo = useCallback(
    (
      id: string,
      fallbackTitle: string,
      fallbackDesc: string
    ): { title: string; description: string } => {
      const match = ACHIEVEMENT_TRANSLATIONS[id];
      if (match) {
        const langData = language === 'en' ? match.en : match.es;
        return {
          title: langData.title,
          description: langData.desc,
        };
      }
      return { title: fallbackTitle, description: fallbackDesc };
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      languagePreference,
      setLanguagePreference,
      t,
      getCountryName,
      getCapitalName,
      getCountryFact,
      getContinentName,
      getAchievementInfo,
    }),
    [
      language,
      languagePreference,
      t,
      getCountryName,
      getCapitalName,
      getCountryFact,
      getContinentName,
      getAchievementInfo,
    ]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => useContext(LanguageContext);
