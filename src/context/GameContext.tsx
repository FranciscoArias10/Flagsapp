import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserStats, Achievement, QuizResult } from '../types';
import { INITIAL_ACHIEVEMENTS } from '../data/achievements';
import { soundService } from '../utils/soundHelper';

const STORAGE_KEY = '@flagspp_user_stats_v1';
const ACHIEVEMENTS_KEY = '@flagspp_achievements_v1';

const LEVEL_THRESHOLDS = [
  { level: 1, xp: 0, title: 'Turista Curioso' },
  { level: 2, xp: 150, title: 'Mochilero' },
  { level: 3, xp: 400, title: 'Viajero Frecuente' },
  { level: 4, xp: 800, title: 'Explorador del Mundo' },
  { level: 5, xp: 1400, title: 'Navegante Global' },
  { level: 6, xp: 2200, title: 'Cartógrafo Real' },
  { level: 7, xp: 3500, title: 'Embajador Mundial' },
  { level: 8, xp: 5000, title: 'Maestro Geógrafo 🌍' },
];

export const getLevelInfo = (xp: number) => {
  let current = LEVEL_THRESHOLDS[0];
  let next = LEVEL_THRESHOLDS[1];

  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i].xp) {
      current = LEVEL_THRESHOLDS[i];
      next = LEVEL_THRESHOLDS[i + 1] || null;
      break;
    }
  }

  const currentLevelMinXp = current.xp;
  const nextLevelXp = next ? next.xp : current.xp + 2000;
  const progress = Math.min(1, Math.max(0, (xp - currentLevelMinXp) / (nextLevelXp - currentLevelMinXp)));

  return {
    level: current.level,
    title: current.title,
    progress,
    currentXp: xp,
    xpToNext: next ? next.xp - xp : 0,
    nextLevelXp,
  };
};

const INITIAL_STATS: UserStats = {
  username: 'Explorador',
  avatar: '🧭',
  favoriteCountryCode: 'ec',
  xp: 0,
  level: 1,
  title: 'Turista Curioso',
  streak: 0,
  bestStreak: 0,
  gamesPlayed: 0,
  correctAnswers: 0,
  totalAnswers: 0,
  continentProgress: {},
  unlockedAchievements: [],
  soundEnabled: true,
  hapticsEnabled: true,
};

interface GameContextType {
  stats: UserStats;
  achievements: Achievement[];
  isLoading: boolean;
  recordAnswer: (isCorrect: boolean) => void;
  recordQuizResult: (result: QuizResult, continent?: string, mode?: string) => void;
  updateProfile: (profile: { username: string; avatar: string; favoriteCountryCode?: string }) => Promise<void>;
  toggleSound: () => void;
  toggleHaptics: () => void;
  resetProgress: () => Promise<void>;
  newAchievementUnlocked: Achievement | null;
  clearAchievementNotification: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stats, setStats] = useState<UserStats>(INITIAL_STATS);
  const [achievements, setAchievements] = useState<Achievement[]>(INITIAL_ACHIEVEMENTS);
  const [isLoading, setIsLoading] = useState(true);
  const [newAchievementUnlocked, setNewAchievementUnlocked] = useState<Achievement | null>(null);

  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      const savedStats = await AsyncStorage.getItem(STORAGE_KEY);
      const savedAchievements = await AsyncStorage.getItem(ACHIEVEMENTS_KEY);

      if (savedStats) {
        const parsed = JSON.parse(savedStats);
        setStats(parsed);
        soundService.setPreferences(parsed.soundEnabled, parsed.hapticsEnabled);
      }
      if (savedAchievements) {
        setAchievements(JSON.parse(savedAchievements));
      }
    } catch (e) {
      console.warn('Error loading storage', e);
    } finally {
      setIsLoading(false);
    }
  };

  const persistData = async (newStats: UserStats, newAchievements: Achievement[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newStats));
      await AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(newAchievements));
    } catch (e) {
      console.warn('Error persisting data', e);
    }
  };

  const checkAchievements = (newStats: UserStats, currentStreak: number, quizScore?: number, totalQ?: number) => {
    let unlockedAny: Achievement | null = null;
    const updatedAchievements = achievements.map((ach) => {
      if (ach.unlocked) return ach;

      let isNowUnlocked = false;

      if (ach.id === 'first_step' && newStats.correctAnswers >= 1) {
        isNowUnlocked = true;
      } else if (ach.id === 'streak_5' && currentStreak >= 5) {
        isNowUnlocked = true;
      } else if (ach.id === 'streak_15' && currentStreak >= 15) {
        isNowUnlocked = true;
      } else if (ach.id === 'xp_500' && newStats.xp >= 500) {
        isNowUnlocked = true;
      } else if (ach.id === 'perfectionist' && quizScore && totalQ && quizScore === totalQ && totalQ >= 5) {
        isNowUnlocked = true;
      }

      if (isNowUnlocked) {
        unlockedAny = { ...ach, unlocked: true, unlockedAt: new Date().toISOString() };
        soundService.triggerCelebration();
        return unlockedAny;
      }
      return ach;
    });

    if (unlockedAny) {
      setNewAchievementUnlocked(unlockedAny);
      setAchievements(updatedAchievements);
      return updatedAchievements;
    }

    return achievements;
  };

  const recordAnswer = (isCorrect: boolean) => {
    setStats((prev) => {
      const newStreak = isCorrect ? prev.streak + 1 : 0;
      const newBestStreak = Math.max(prev.bestStreak, newStreak);
      const newCorrect = isCorrect ? prev.correctAnswers + 1 : prev.correctAnswers;
      const newTotal = prev.totalAnswers + 1;

      const newStats: UserStats = {
        ...prev,
        streak: newStreak,
        bestStreak: newBestStreak,
        correctAnswers: newCorrect,
        totalAnswers: newTotal,
      };

      const updatedAchievements = checkAchievements(newStats, newStreak);
      persistData(newStats, updatedAchievements);
      return newStats;
    });
  };

  const recordQuizResult = (result: QuizResult, continent?: string, mode?: string) => {
    setStats((prev) => {
      const newXp = prev.xp + result.xpEarned;
      const levelInfo = getLevelInfo(newXp);
      const newGames = prev.gamesPlayed + 1;
      const newBestStreak = Math.max(prev.bestStreak, result.highestStreak);

      const continentProgress = { ...prev.continentProgress };
      if (continent) {
        const existing = continentProgress[continent] || { correct: 0, total: 0, stars: 0 };
        continentProgress[continent] = {
          correct: existing.correct + result.score,
          total: existing.total + result.totalQuestions,
          stars: Math.max(existing.stars, result.stars),
        };
      }

      const newStats: UserStats = {
        ...prev,
        xp: newXp,
        level: levelInfo.level,
        title: levelInfo.title,
        bestStreak: newBestStreak,
        gamesPlayed: newGames,
        continentProgress,
      };

      let currentAch = achievements;
      if (continent === 'América' && result.score >= 8) {
        currentAch = currentAch.map(a => a.id === 'america_explorer' ? { ...a, unlocked: true } : a);
      }
      if (continent === 'Europa' && result.score >= 8) {
        currentAch = currentAch.map(a => a.id === 'europe_explorer' ? { ...a, unlocked: true } : a);
      }
      if (mode === 'blitz' && result.score >= 12) {
        currentAch = currentAch.map(a => a.id === 'blitz_champion' ? { ...a, unlocked: true } : a);
      }
      if (mode === 'capitals' && result.score >= 10) {
        currentAch = currentAch.map(a => a.id === 'capitals_master' ? { ...a, unlocked: true } : a);
      }

      const updatedAchievements = checkAchievements(newStats, result.highestStreak, result.score, result.totalQuestions);
      persistData(newStats, updatedAchievements);
      return newStats;
    });
  };

  const toggleSound = () => {
    setStats((prev) => {
      const updated = { ...prev, soundEnabled: !prev.soundEnabled };
      soundService.setPreferences(updated.soundEnabled, updated.hapticsEnabled);
      persistData(updated, achievements);
      return updated;
    });
  };

  const toggleHaptics = () => {
    setStats((prev) => {
      const updated = { ...prev, hapticsEnabled: !prev.hapticsEnabled };
      soundService.setPreferences(updated.soundEnabled, updated.hapticsEnabled);
      persistData(updated, achievements);
      return updated;
    });
  };

  const updateProfile = async (profile: { username: string; avatar: string; favoriteCountryCode?: string }) => {
    setStats((prev) => {
      const updated = {
        ...prev,
        username: profile.username.trim() || 'Explorador',
        avatar: profile.avatar || '🧭',
        favoriteCountryCode: profile.favoriteCountryCode,
      };
      persistData(updated, achievements);
      return updated;
    });
  };

  const resetProgress = async () => {
    setStats(INITIAL_STATS);
    setAchievements(INITIAL_ACHIEVEMENTS);
    await AsyncStorage.removeItem(STORAGE_KEY);
    await AsyncStorage.removeItem(ACHIEVEMENTS_KEY);
  };

  const clearAchievementNotification = () => {
    setNewAchievementUnlocked(null);
  };

  return (
    <GameContext.Provider
      value={{
        stats,
        achievements,
        isLoading,
        recordAnswer,
        recordQuizResult,
        updateProfile,
        toggleSound,
        toggleHaptics,
        resetProgress,
        newAchievementUnlocked,
        clearAchievementNotification,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
