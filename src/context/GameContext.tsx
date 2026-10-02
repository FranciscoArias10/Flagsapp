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
  capitalsProgress: {},
  unlockedAchievements: [],
  soundEnabled: true,
  hapticsEnabled: true,
  fastAnswerOpportunityEnabled: true,
};

interface GameContextType {
  stats: UserStats;
  achievements: Achievement[];
  isLoading: boolean;
  recordAnswer: (isCorrect: boolean) => void;
  recordGameStart: () => void;
  recordQuizResult: (result: QuizResult, continent?: string, mode?: string, alreadyCountedGame?: boolean) => void;
  updateProfile: (profile: { username: string; avatar: string; favoriteCountryCode?: string }) => Promise<void>;
  toggleSound: () => void;
  toggleHaptics: () => void;
  toggleFastAnswerOpportunity: () => void;
  resetProgress: () => Promise<void>;
  exportBackupData: () => Promise<string>;
  importBackupData: (backupJson: string) => Promise<{ success: boolean; message: string }>;
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
        if (parsed.fastAnswerOpportunityEnabled === undefined) {
          parsed.fastAnswerOpportunityEnabled = true;
        }
        // Self-heal gamesPlayed if it was 0 or undercounted compared to total answers
        if (parsed.totalAnswers > 0) {
          const estimatedMinGames = Math.ceil(parsed.totalAnswers / 12);
          if (!parsed.gamesPlayed || parsed.gamesPlayed < estimatedMinGames) {
            parsed.gamesPlayed = Math.max(parsed.gamesPlayed || 0, estimatedMinGames);
          }
        }
        setStats(parsed);
        soundService.setPreferences(parsed.soundEnabled, parsed.hapticsEnabled);
      }
      if (savedAchievements) {
        const parsedAch: Achievement[] = JSON.parse(savedAchievements);
        const merged = INITIAL_ACHIEVEMENTS.map((initial) => {
          const found = parsedAch.find((a) => a.id === initial.id);
          return found ? { ...initial, ...found } : initial;
        });
        setAchievements(merged);
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

  const checkAchievements = (
    newStats: UserStats,
    currentStreak: number,
    quizScore?: number,
    totalQ?: number,
    continent?: string,
    mode?: string
  ) => {
    let unlockedAny: Achievement | null = null;
    let anyChanged = false;

    const updatedAchievements = achievements.map((ach) => {
      let isNowUnlocked = false;
      let newCount = ach.currentCount;

      if (ach.id === 'first_step') {
        newCount = Math.min(ach.targetCount, newStats.correctAnswers);
        if (newStats.correctAnswers >= 1) isNowUnlocked = true;
      } else if (ach.id === 'streak_5') {
        newCount = Math.min(ach.targetCount, Math.max(currentStreak, newStats.bestStreak));
        if (newCount >= 5) isNowUnlocked = true;
      } else if (ach.id === 'streak_15') {
        newCount = Math.min(ach.targetCount, Math.max(currentStreak, newStats.bestStreak));
        if (newCount >= 15) isNowUnlocked = true;
      } else if (ach.id === 'streak_25') {
        newCount = Math.min(ach.targetCount, Math.max(currentStreak, newStats.bestStreak));
        if (newCount >= 25) isNowUnlocked = true;
      } else if (ach.id === 'marathon_100') {
        newCount = Math.min(ach.targetCount, newStats.correctAnswers);
        if (newStats.correctAnswers >= 100) isNowUnlocked = true;
      } else if (ach.id === 'xp_500') {
        newCount = Math.min(ach.targetCount, newStats.xp);
        if (newStats.xp >= 500) isNowUnlocked = true;
      } else if (ach.id === 'perfectionist') {
        if (quizScore && totalQ && quizScore === totalQ && totalQ >= 5) {
          newCount = 1;
          isNowUnlocked = true;
        }
      } else if (ach.id === 'america_explorer') {
        if (continent === 'América' && (quizScore ?? 0) >= 8) {
          newCount = 8;
          isNowUnlocked = true;
        } else if (continent === 'América') {
          newCount = Math.max(newCount, Math.min(8, quizScore ?? 0));
        }
      } else if (ach.id === 'europe_explorer') {
        if (continent === 'Europa' && (quizScore ?? 0) >= 8) {
          newCount = 8;
          isNowUnlocked = true;
        } else if (continent === 'Europa') {
          newCount = Math.max(newCount, Math.min(8, quizScore ?? 0));
        }
      } else if (ach.id === 'africa_conqueror') {
        if (continent === 'África' && (quizScore ?? 0) >= 8) {
          newCount = 8;
          isNowUnlocked = true;
        } else if (continent === 'África') {
          newCount = Math.max(newCount, Math.min(8, quizScore ?? 0));
        }
      } else if (ach.id === 'oceania_expert') {
        if (continent === 'Oceanía' && (quizScore ?? 0) >= 6) {
          newCount = 6;
          isNowUnlocked = true;
        } else if (continent === 'Oceanía') {
          newCount = Math.max(newCount, Math.min(6, quizScore ?? 0));
        }
      } else if (ach.id === 'blitz_champion') {
        if (mode === 'blitz' && (quizScore ?? 0) >= 12) {
          newCount = 12;
          isNowUnlocked = true;
        } else if (mode === 'blitz') {
          newCount = Math.max(newCount, Math.min(12, quizScore ?? 0));
        }
      } else if (ach.id === 'blitz_master_5s') {
        if (mode === 'blitz' && continent === 'hard' && (quizScore ?? 0) >= 10) {
          newCount = 10;
          isNowUnlocked = true;
        } else if (mode === 'blitz' && continent === 'hard') {
          newCount = Math.max(newCount, Math.min(10, quizScore ?? 0));
        }
      } else if (ach.id === 'capitals_master') {
        if (mode === 'capitals' && (quizScore ?? 0) >= 15) {
          newCount = 15;
          isNowUnlocked = true;
        } else if (mode === 'capitals') {
          newCount = Math.max(newCount, Math.min(15, quizScore ?? 0));
        }
      }

      if (!ach.unlocked && isNowUnlocked) {
        unlockedAny = {
          ...ach,
          unlocked: true,
          unlockedAt: new Date().toISOString(),
          currentCount: ach.targetCount,
        };
        soundService.triggerCelebration();
        anyChanged = true;
        return unlockedAny;
      }

      if (newCount !== ach.currentCount) {
        anyChanged = true;
        return { ...ach, currentCount: newCount };
      }

      return ach;
    });

    if (unlockedAny) {
      setNewAchievementUnlocked(unlockedAny);
    }

    if (anyChanged) {
      setAchievements(updatedAchievements);
    }

    return updatedAchievements;
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

  const recordGameStart = () => {
    setStats((prev) => {
      const newGames = prev.gamesPlayed + 1;
      const updated = {
        ...prev,
        gamesPlayed: newGames,
      };
      persistData(updated, achievements);
      return updated;
    });
  };

  const recordQuizResult = (result: QuizResult, continent?: string, mode?: string, alreadyCountedGame?: boolean) => {
    setStats((prev) => {
      const newXp = prev.xp + result.xpEarned;
      const levelInfo = getLevelInfo(newXp);
      const newGames = alreadyCountedGame ? prev.gamesPlayed : prev.gamesPlayed + 1;
      const newBestStreak = Math.max(prev.bestStreak, result.highestStreak);

      const continentProgress = { ...prev.continentProgress };
      if (continent && mode !== 'capitals') {
        const existing = continentProgress[continent] || { correct: 0, total: 0, stars: 0 };
        continentProgress[continent] = {
          correct: existing.correct + result.score,
          total: existing.total + result.totalQuestions,
          stars: Math.max(existing.stars, result.stars),
        };
      }

      const capitalsProgress = { ...(prev.capitalsProgress || {}) };
      if (mode === 'capitals' && continent) {
        const existing = capitalsProgress[continent] || { correct: 0, total: 0, stars: 0, bestScore: 0 };
        capitalsProgress[continent] = {
          correct: existing.correct + result.score,
          total: existing.total + result.totalQuestions,
          stars: Math.max(existing.stars, result.stars),
          bestScore: Math.max(existing.bestScore || 0, result.score),
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
        capitalsProgress,
      };

      const updatedAchievements = checkAchievements(
        newStats,
        result.highestStreak,
        result.score,
        result.totalQuestions,
        continent,
        mode
      );
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

  const toggleFastAnswerOpportunity = () => {
    setStats((prev) => {
      const updated = {
        ...prev,
        fastAnswerOpportunityEnabled: prev.fastAnswerOpportunityEnabled === false ? true : false,
      };
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

  const exportBackupData = async (): Promise<string> => {
    const backup = {
      app: 'Flags++',
      version: 1,
      exportedAt: new Date().toISOString(),
      stats,
      achievements,
    };
    return JSON.stringify(backup, null, 2);
  };

  const importBackupData = async (backupJson: string): Promise<{ success: boolean; message: string }> => {
    try {
      const data = JSON.parse(backupJson.trim());
      if (!data || typeof data !== 'object') {
        return { success: false, message: 'El formato no es un JSON válido.' };
      }
      if (!data.stats || typeof data.stats.xp !== 'number') {
        return { success: false, message: 'El respaldo no contiene estadísticas válidas de Flags++.' };
      }

      const mergedStats: UserStats = {
        ...INITIAL_STATS,
        ...data.stats,
      };

      const mergedAchievements: Achievement[] = Array.isArray(data.achievements)
        ? data.achievements
        : INITIAL_ACHIEVEMENTS;

      setStats(mergedStats);
      setAchievements(mergedAchievements);
      soundService.setPreferences(mergedStats.soundEnabled, mergedStats.hapticsEnabled);
      await persistData(mergedStats, mergedAchievements);
      soundService.triggerSuccess();

      return {
        success: true,
        message: `¡Progreso restaurado con éxito! Bienvenido de nuevo, ${mergedStats.username || 'Explorador'} (Nivel ${mergedStats.level}, ${mergedStats.xp} XP).`,
      };
    } catch (e) {
      return { success: false, message: 'No se pudo leer el archivo de respaldo. Asegúrate de copiar el texto completo.' };
    }
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
        recordGameStart,
        recordQuizResult,
        updateProfile,
        toggleSound,
        toggleHaptics,
        toggleFastAnswerOpportunity,
        resetProgress,
        exportBackupData,
        importBackupData,
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
