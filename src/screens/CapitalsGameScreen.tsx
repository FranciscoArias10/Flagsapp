import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  ScrollView,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Country, QuizResult, AnswerReviewItem } from '../types';
import { COUNTRIES } from '../data/countries';
import { COUNTRY_CITIES } from '../data/countryCities';
import { calculateStars, calculateXpEarned } from '../utils/quizGenerator';
import { IOSColors } from '../utils/colors';
import { soundService } from '../utils/soundHelper';
import { speechService } from '../utils/speechHelper';
import { FlagImage } from '../components/FlagImage';
import { ProgressBar } from '../components/ProgressBar';
import { AppleButton } from '../components/AppleButton';
import { StreakBadge } from '../components/StreakBadge';
import { ConfettiView } from '../components/ConfettiView';
import { ReviewAnswersModal } from '../components/ReviewAnswersModal';
import { GameStartModal } from '../components/GameStartModal';
import { useGame } from '../context/GameContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useHandsFreeQuiz } from '../hooks/useHandsFreeQuiz';

export type CapitalDifficulty = 'easy' | 'medium' | 'hard' | 'all';

export interface CapitalDifficultyConfig {
  key: CapitalDifficulty;
  title: string;
  shortName: string;
  subtitle: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  gradient: [string, string];
  tag: string;
  tagBg: string;
  tagColor: string;
  countryCount: number;
  examples: string;
}

export const CAPITALS_DIFFICULTIES: Record<CapitalDifficulty, CapitalDifficultyConfig> = {
  easy: {
    key: 'easy',
    title: 'Nivel Fácil (Principiante)',
    shortName: 'Fácil',
    subtitle: 'Capitales populares y emblemáticas',
    description: 'Ideal para comenzar y dominar las capitales más conocidas.',
    icon: 'leaf',
    color: '#34C759',
    gradient: ['#34C759', '#30B0C7'],
    tag: 'NIVEL 1 • 33 PAÍSES',
    tagBg: 'rgba(52, 199, 89, 0.15)',
    tagColor: '#34C759',
    countryCount: 33,
    examples: 'Madrid, París, Tokio, Londres, Roma, Buenos Aires, Bogotá, México...',
  },
  medium: {
    key: 'medium',
    title: 'Nivel Intermedio (Desafío)',
    shortName: 'Intermedio',
    subtitle: 'Capitales moderadas de los 5 continentes',
    description: 'Un buen reto con capitales que pondrán a prueba tu memoria.',
    icon: 'school',
    color: '#FF9500',
    gradient: ['#FF9500', '#FFCC00'],
    tag: 'NIVEL 2 • 75 PAÍSES',
    tagBg: 'rgba(255, 149, 0, 0.15)',
    tagColor: '#FF9500',
    countryCount: 75,
    examples: 'Canberra, Ottawa, Ankara, Helsinki, Oslo, Varsovia, Bangkok, Seúl...',
  },
  hard: {
    key: 'hard',
    title: 'Nivel Experto (Hardcore)',
    shortName: 'Experto',
    subtitle: 'Capitales remotas, islas y países exóticos',
    description: 'Solo para verdaderos maestros de la geografía mundial.',
    icon: 'flame',
    color: '#FF3B30',
    gradient: ['#FF3B30', '#AF52DE'],
    tag: 'NIVEL 3 • 18 PAÍSES',
    tagBg: 'rgba(255, 59, 48, 0.15)',
    tagColor: '#FF3B30',
    countryCount: 18,
    examples: 'Palikir, Ngerulmud, Nukualofa, Astaná, Yamusukro, Port Vila...',
  },
  all: {
    key: 'all',
    title: 'Todas las Capitales (Mixto)',
    shortName: 'Todas',
    subtitle: 'Catálogo global con los 126 países',
    description: 'Preguntas aleatorias de todos los niveles y continentes combinados.',
    icon: 'earth',
    color: '#007AFF',
    gradient: ['#007AFF', '#5856D6'],
    tag: 'GLOBAL • 126 PAÍSES',
    tagBg: 'rgba(0, 122, 255, 0.15)',
    tagColor: '#007AFF',
    countryCount: 126,
    examples: 'Desafío completo con todo el catálogo mundial de Flags++.',
  },
};

interface CapitalQuestion {
  country: Country;
  options: string[]; // 4 capital choices
  correctCapital: string;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Memory of asked countries in Capitals to prevent repetitions across rounds
const askedCapitalsHistory: Map<string, Set<string>> = new Map();

export const CapitalsGameScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) : 0);
  const { recordAnswer, recordGameStart, recordQuizResult, stats, toggleVoiceAnnouncer, toggleHandsFreeMode } = useGame();
  const { isDark, colors } = useTheme();
  const { language, t, getCountryName, getCapitalName, getCountryFact, getContinentName } = useLanguage();
  const hasCountedGameRef = useRef(false);

  const getDiffConfig = (diff: CapitalDifficultyConfig): CapitalDifficultyConfig => {
    return {
      ...diff,
      title: t(`capitals_${diff.key}_title` as any),
      shortName: t(`capitals_${diff.key}_short` as any),
      subtitle: t(`capitals_${diff.key}_subtitle` as any),
      description: t(`capitals_${diff.key}_desc` as any),
      tag: t(`capitals_${diff.key}_tag` as any),
    };
  };

  const [screenMode, setScreenMode] = useState<'difficulty_select' | 'playing'>('difficulty_select');
  const [selectedDifficulty, setSelectedDifficulty] = useState<CapitalDifficulty>('easy');
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<number | 'all'>(10);

  const [questions, setQuestions] = useState<CapitalQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCapital, setSelectedCapital] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [highestStreak, setHighestStreak] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [reviewItems, setReviewItems] = useState<AnswerReviewItem[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Retry & Second Chance mechanics
  const [isRetryRound, setIsRetryRound] = useState(false);
  const [hasSecondChance, setHasSecondChance] = useState(false);
  const [shieldMessage, setShieldMessage] = useState<string | null>(null);
  const [eliminatedCapitals, setEliminatedCapitals] = useState<string[]>([]);
  const questionStartTimeRef = useRef<number>(Date.now());

  const [questionTimeLimit, setQuestionTimeLimit] = useState<number>(15);
  const [pendingDifficulty, setPendingDifficulty] = useState<CapitalDifficultyConfig | null>(null);
  const [timeLeft, setTimeLeft] = useState(questionTimeLimit);
  const questionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownAnim = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.92)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, []);

  // Per-question countdown timer interval (pure state update only)
  useEffect(() => {
    if (questions.length === 0 || showSummary || isAnswered || screenMode !== 'playing') {
      if (questionTimerRef.current) {
        clearInterval(questionTimerRef.current);
        questionTimerRef.current = null;
      }
      return;
    }

    setTimeLeft(questionTimeLimit);
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);

    questionTimerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (questionTimerRef.current) {
        clearInterval(questionTimerRef.current);
        questionTimerRef.current = null;
      }
    };
  }, [currentIndex, questions.length, showSummary, isAnswered, screenMode, questionTimeLimit]);

  // Handle timeout safely in an effect hook (avoids updating GameProvider during render)
  useEffect(() => {
    if (screenMode !== 'playing' || questions.length === 0 || showSummary || isAnswered) {
      return;
    }

    if (timeLeft === 0) {
      if (questionTimerRef.current) {
        clearInterval(questionTimerRef.current);
        questionTimerRef.current = null;
      }
      handleTimeout();
    } else if (timeLeft <= 4 && timeLeft > 0) {
      soundService.triggerCountdownTick();
    }
  }, [timeLeft, isAnswered, screenMode, questions.length, showSummary]);

  // Voice Announcer effect: read the capital question aloud when enabled
  useEffect(() => {
    if (
      screenMode === 'playing' &&
      !showSummary &&
      !isAnswered &&
      questions[currentIndex] &&
      stats.voiceAnnouncerEnabled
    ) {
      const q = questions[currentIndex];
      const countryName = getCountryName(q.country);
      speechService.speakCapitalQuestion(countryName, language);
    }
    return () => {
      speechService.stop();
    };
  }, [currentIndex, screenMode, showSummary, isAnswered, language, stats.voiceAnnouncerEnabled]);

  // Stop speech on unmount
  useEffect(() => {
    return () => {
      speechService.stop();
    };
  }, []);

  const generateCapitalQuestions = (
    count: number | 'all' = selectedQuestionCount,
    difficulty = selectedDifficulty
  ): CapitalQuestion[] => {
    let pool = COUNTRIES;

    if (difficulty !== 'all') {
      const targetDiff = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;
      const filtered = pool.filter((c) => c.difficulty === targetDiff);
      if (filtered.length >= 4) {
        pool = filtered;
      } else {
        const allWithDiff = COUNTRIES.filter((c) => c.difficulty === targetDiff);
        pool = allWithDiff.length >= 4 ? allWithDiff : pool;
      }
    }

    const poolKey = `capitals_${difficulty}`;
    if (!askedCapitalsHistory.has(poolKey)) {
      askedCapitalsHistory.set(poolKey, new Set<string>());
    }
    const askedSet = askedCapitalsHistory.get(poolKey)!;

    const targetCount = count === 'all' ? pool.length : Math.min(count, pool.length);

    // Filter unseen countries to ensure zero duplicates across rounds
    const unseen = pool.filter((c) => !askedSet.has(c.code));
    let selected: Country[] = [];

    if (unseen.length >= targetCount) {
      selected = shuffleArray(unseen).slice(0, targetCount);
    } else {
      selected = [...shuffleArray(unseen)];
      const needed = targetCount - selected.length;
      askedSet.clear();
      const remainingPool = pool.filter((c) => !selected.some((s) => s.code === c.code));
      const extra = shuffleArray(remainingPool).slice(0, needed);
      selected.push(...extra);
    }

    // Save into history
    selected.forEach((c) => askedSet.add(c.code));

    return selected.map((country) => {
      const localizedCorrectCapital = getCapitalName(country);
      // 1. Same-country real cities (e.g. Guayaquil, Machala, Cuenca for Ecuador)
      const sameCountryCities = (COUNTRY_CITIES[country.code] || [])
        .filter((cityName) => cityName.toLowerCase().trim() !== country.capital.toLowerCase().trim());

      let distractors: string[] = [];
      if (sameCountryCities.length >= 3) {
        distractors = shuffleArray(sameCountryCities).slice(0, 3);
      } else {
        // Fallback for microstates or if fewer than 3 cities are available
        const fallbackCities = [...sameCountryCities];
        const sameContinentCapitals = pool
          .filter((c) => c.capital !== country.capital && !fallbackCities.includes(c.capital))
          .map((c) => getCapitalName(c));
        const extraNeeded = 3 - fallbackCities.length;
        const extraCapitals = shuffleArray(sameContinentCapitals).slice(0, extraNeeded);
        distractors = [...fallbackCities, ...extraCapitals];
      }

      const options = shuffleArray([localizedCorrectCapital, ...distractors]);

      return {
        country,
        options,
        correctCapital: localizedCorrectCapital,
      };
    });
  };

  const startNewRound = (
    difficulty = selectedDifficulty,
    count = selectedQuestionCount,
    timeLimit = questionTimeLimit
  ) => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    if (questionTimerRef.current) {
      clearInterval(questionTimerRef.current);
      questionTimerRef.current = null;
    }
    countdownAnim.stopAnimation();
    countdownAnim.setValue(0);
    setTimeLeft(timeLimit);
    const qs = generateCapitalQuestions(count, difficulty);
    setIsRetryRound(false);
    hasCountedGameRef.current = false;
    setQuestions(qs);
    setCurrentIndex(0);
    setSelectedCapital(null);
    setIsAnswered(false);
    setEliminatedCapitals([]);
    setHasSecondChance(false);
    setShieldMessage(null);
    setScore(0);
    setStreak(0);
    setHighestStreak(0);
    setReviewItems([]);
    setShowSummary(false);
    setShowConfetti(false);
    setShowReviewModal(false);
    questionStartTimeRef.current = Date.now();
    animateCard();
  };

  const startRetryFailedCapitals = () => {
    const failedItems = reviewItems.filter((i) => !i.isCorrect);
    if (failedItems.length === 0) return;

    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    if (questionTimerRef.current) {
      clearInterval(questionTimerRef.current);
      questionTimerRef.current = null;
    }
    countdownAnim.stopAnimation();
    countdownAnim.setValue(0);
    setTimeLeft(questionTimeLimit);

    const failedCodes = failedItems.map((f) => f.countryCode).filter(Boolean);
    const failedCountries = COUNTRIES.filter((c) => failedCodes.includes(c.code));

    const retryQs: CapitalQuestion[] = failedCountries.map((country) => {
      const localizedCorrectCapital = getCapitalName(country);
      const sameCountryCities = (COUNTRY_CITIES[country.code] || [])
        .filter((cityName) => cityName.toLowerCase().trim() !== country.capital.toLowerCase().trim());

      let distractors: string[] = [];
      if (sameCountryCities.length >= 3) {
        distractors = shuffleArray(sameCountryCities).slice(0, 3);
      } else {
        const fallbackCities = [...sameCountryCities];
        const otherCapitals = COUNTRIES
          .filter((c) => c.capital !== country.capital && !fallbackCities.includes(c.capital))
          .map((c) => getCapitalName(c));
        const extraNeeded = 3 - fallbackCities.length;
        const extraCapitals = shuffleArray(otherCapitals).slice(0, extraNeeded);
        distractors = [...fallbackCities, ...extraCapitals];
      }

      const options = shuffleArray([localizedCorrectCapital, ...distractors]);
      return {
        country,
        options,
        correctCapital: localizedCorrectCapital,
      };
    });

    setIsRetryRound(true);
    hasCountedGameRef.current = false;
    setQuestions(retryQs);
    setCurrentIndex(0);
    setSelectedCapital(null);
    setIsAnswered(false);
    setEliminatedCapitals([]);
    setHasSecondChance(false);
    setShieldMessage(null);
    setScore(0);
    setStreak(0);
    setHighestStreak(0);
    setReviewItems([]);
    setShowSummary(false);
    setShowConfetti(false);
    setShowReviewModal(false);
    questionStartTimeRef.current = Date.now();
    animateCard();
  };

  const handleStartWithDifficulty = (diffKey: CapitalDifficulty) => {
    soundService.triggerMediumTap();
    setPendingDifficulty(getDiffConfig(CAPITALS_DIFFICULTIES[diffKey]));
  };

  const animateCard = () => {
    cardScale.setValue(0.92);
    Animated.spring(cardScale, {
      toValue: 1,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleTimeout = () => {
    speechService.stop();
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedCapital(null);

    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    setReviewItems((prev) => [
      ...prev,
      {
        id: `${currentQ.country.code}-${currentIndex}`,
        flagEmoji: currentQ.country.flagEmoji,
        countryName: getCountryName(currentQ.country),
        countryCode: currentQ.country.code,
        userAnswer: t('quiz_timeout_user_answer'),
        correctAnswer: currentQ.correctCapital,
        isCorrect: false,
        fact: getCountryFact(currentQ.country),
      },
    ]);

    if (!hasCountedGameRef.current) {
      recordGameStart();
      hasCountedGameRef.current = true;
    }
    recordAnswer(false);
    soundService.triggerError();
    triggerShake();
    setStreak(0);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 120);

    countdownAnim.setValue(0);
    Animated.timing(countdownAnim, {
      toValue: 1,
      duration: 1800,
      useNativeDriver: false,
    }).start();

    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    autoAdvanceTimer.current = setTimeout(() => {
      handleNext();
    }, 1800);
  };

  const handleSelectCapital = (cap: string) => {
    if (isAnswered || eliminatedCapitals.includes(cap)) return;
    speechService.stop();

    const currentQ = questions[currentIndex];
    const isCorrect = cap === currentQ.correctCapital;
    const fastOpportunityEnabled = stats.fastAnswerOpportunityEnabled !== false;
    const elapsedSeconds = (Date.now() - questionStartTimeRef.current) / 1000;

    // Fast Answer Second Chance Shield Defense
    if (!isCorrect && fastOpportunityEnabled && hasSecondChance) {
      setHasSecondChance(false);
      setEliminatedCapitals((prev) => [...prev, cap]);
      soundService.triggerShield();
      triggerShake();
      setShieldMessage('🛡️ ¡Segunda Oportunidad Activada! Te queda un intento en esta capital');
      setTimeLeft((prev) => Math.max(prev, 5));
      return;
    }

    if (questionTimerRef.current) {
      clearInterval(questionTimerRef.current);
      questionTimerRef.current = null;
    }

    setSelectedCapital(cap);
    setIsAnswered(true);

    // Fast Answer Second Chance Shield Reward
    if (isCorrect && fastOpportunityEnabled && !hasSecondChance && elapsedSeconds <= 2.5) {
      setHasSecondChance(true);
      soundService.triggerShield();
      setShieldMessage('⚡ ¡Respuesta Relámpago! Ganaste 1 Segunda Oportunidad 🛡️');
      setTimeout(() => setShieldMessage(null), 3000);
    }

    // Record review item
    setReviewItems((prev) => [
      ...prev,
      {
        id: `${currentQ.country.code}-${currentIndex}`,
        flagEmoji: currentQ.country.flagEmoji,
        countryName: currentQ.country.name,
        countryCode: currentQ.country.code,
        userAnswer: cap,
        correctAnswer: currentQ.correctCapital,
        isCorrect,
        fact: currentQ.country.fact,
      },
    ]);

    if (!hasCountedGameRef.current) {
      recordGameStart();
      hasCountedGameRef.current = true;
    }
    recordAnswer(isCorrect);

    if (isCorrect) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setHighestStreak((prev) => Math.max(prev, nextStreak));
      setScore((prev) => prev + 1);
      if (nextStreak > 0 && nextStreak % 5 === 0) {
        soundService.triggerStreak();
      } else {
        soundService.triggerSuccess();
      }
    } else {
      soundService.triggerError();
      triggerShake();
      setStreak(0);
    }

    // Smooth scroll to display the educational fact
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 120);

    // Visual countdown bar animation
    countdownAnim.setValue(0);
    Animated.timing(countdownAnim, {
      toValue: 1,
      duration: isCorrect ? 1200 : 1600,
      useNativeDriver: false,
    }).start();

    // Auto-advance with timer: 1200ms on correct, 1600ms on error
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    autoAdvanceTimer.current = setTimeout(() => {
      handleNext();
    }, isCorrect ? 1200 : 1600);
  };

  const handleNext = () => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    if (questionTimerRef.current) {
      clearInterval(questionTimerRef.current);
      questionTimerRef.current = null;
    }
    countdownAnim.stopAnimation();
    countdownAnim.setValue(0);
    setTimeLeft(questionTimeLimit);

    soundService.triggerLightTap();

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedCapital(null);
      setIsAnswered(false);
      setEliminatedCapitals([]);
      setShieldMessage(null);
      questionStartTimeRef.current = Date.now();
      animateCard();
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    } else {
      finishRound();
    }
  };

  const finishRound = () => {
    const finalScore = score;
    const total = questions.length;
    const stars = calculateStars(finalScore, total);
    const xpEarned = calculateXpEarned(finalScore, total, highestStreak);
    const accuracy = Math.round((finalScore / total) * 100);

    const result: QuizResult = {
      score: finalScore,
      totalQuestions: total,
      xpEarned,
      accuracy,
      highestStreak,
      stars,
    };

    recordQuizResult(result, selectedDifficulty, 'capitals', hasCountedGameRef.current);
    hasCountedGameRef.current = true;
    setShowSummary(true);

    if (stars >= 2) {
      setShowConfetti(true);
      soundService.triggerCelebration();
    }
  };

  const renderStars = (stars: number = 0) => {
    return (
      <View style={styles.starsRowCompact}>
        {[1, 2, 3].map((s) => (
          <Ionicons
            key={s}
            name="star"
            size={13}
            color={stars >= s ? colors.goldStar : isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(120, 120, 128, 0.25)'}
          />
        ))}
      </View>
    );
  };

  const handleBackToDifficulty = () => {
    soundService.triggerLightTap();
    speechService.stop();
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);

    if (!showSummary && hasCountedGameRef.current && reviewItems.length > 0) {
      const answeredTotal = reviewItems.length;
      const partialXp = calculateXpEarned(score, answeredTotal, highestStreak);
      const partialResult: QuizResult = {
        score,
        totalQuestions: answeredTotal,
        xpEarned: partialXp,
        accuracy: Math.round((score / answeredTotal) * 100),
        highestStreak,
        stars: calculateStars(score, answeredTotal),
      };
      recordQuizResult(partialResult, selectedDifficulty, 'capitals', true);
    }
    setShowSummary(false);
    setScreenMode('difficulty_select');
  };

  const handsFree = useHandsFreeQuiz({
    enabled: Boolean(stats.handsFreeModeEnabled),
    isActive: screenMode === 'playing' && !showSummary && !isAnswered && Boolean(questions[currentIndex]),
    targetAnswer: questions[currentIndex]?.correctCapital || '',
    distractors: questions[currentIndex]?.options.filter((o) => o !== questions[currentIndex]?.correctCapital) || [],
    language: language === 'en' ? 'en' : 'es',
    onAnswerMatch: (matchedOption) => {
      handleSelectCapital(matchedOption);
    },
  });

  // 1. DIFFICULTY SELECTION SCREEN
  if (screenMode === 'difficulty_select') {
    return (
      <View style={[styles.container, { backgroundColor: colors.systemBackground, paddingTop: topInset, paddingBottom: Math.max(insets.bottom, 20) }]}>
        {/* Header bar */}
        <View style={styles.diffHeaderBar}>
          <View style={styles.diffHeaderTopRow}>
            <Text style={[styles.diffPretitle, { color: colors.secondaryLabel }]} numberOfLines={1}>
              {t('capitals_header_category')}
            </Text>
            <View style={styles.headerRight}>
              <StreakBadge streak={stats.streak} size="small" />
              <View style={[styles.xpPill, { backgroundColor: isDark ? 'rgba(175, 82, 222, 0.18)' : 'rgba(175, 82, 222, 0.12)' }]}>
                <Ionicons name="sparkles" size={13} color={colors.systemPurple} />
                <Text style={[styles.xpPillText, { color: colors.systemPurple }]}>{stats.xp} XP</Text>
              </View>
            </View>
          </View>
          <Text style={[styles.diffTitle, { color: colors.label }]} numberOfLines={1} adjustsFontSizeToFit>
            {t('capitals_header_title')}
          </Text>
        </View>

        <ScrollView
          style={styles.diffScroll}
          contentContainerStyle={[styles.diffScrollContent, { paddingBottom: 130 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.diffSubtitle, { color: colors.secondaryLabel }]}>
            {t('capitals_header_subtitle')}
          </Text>

          {/* Cards for each difficulty */}
          {(Object.keys(CAPITALS_DIFFICULTIES) as CapitalDifficulty[]).map((key) => {
            const rawDiff = CAPITALS_DIFFICULTIES[key];
            const diff = getDiffConfig(rawDiff);
            const isFeatured = key === 'medium';
            const isHard = key === 'hard';
            const prog = stats.capitalsProgress?.[diff.key] || { correct: 0, total: 0, stars: 0, bestScore: 0 };

            return (
              <Pressable
                key={diff.key}
                onPress={() => handleStartWithDifficulty(diff.key)}
                style={({ pressed }) => [
                  styles.diffCard,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.cardBorder,
                  },
                  colors.cardShadow,
                  isFeatured && styles.diffCardFeatured,
                  isHard && styles.diffCardHard,
                  pressed && { transform: [{ scale: 0.98 }] },
                ]}
              >
                {/* Header row */}
                <View style={styles.diffCardTopRow}>
                  <LinearGradient
                    colors={diff.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.diffIconGradient}
                  >
                    <Ionicons name={diff.icon} size={22} color="#FFFFFF" />
                  </LinearGradient>

                  <View style={styles.diffCardHeadText}>
                    <View style={styles.diffTagAndStarsRow}>
                      <View style={[styles.diffTagBadge, { backgroundColor: diff.tagBg }]}>
                        <Text style={[styles.diffTagBadgeText, { color: diff.tagColor }]}>
                          {diff.tag}
                        </Text>
                      </View>
                      <View style={styles.diffStarsRow}>
                        {renderStars(prog.stars)}
                        {Boolean(prog.bestScore && prog.bestScore > 0) && (
                          <Text style={[styles.diffBestScoreText, { color: colors.secondaryLabel }]}>
                            {t('capitals_best_score', { score: prog.bestScore ?? 0 })}
                          </Text>
                        )}
                      </View>
                    </View>
                    <Text style={[styles.diffCardTitle, { color: colors.label }]} numberOfLines={1} adjustsFontSizeToFit>
                      {diff.title}
                    </Text>
                    <Text style={[styles.diffCardSubtitle, { color: colors.secondaryLabel }]} numberOfLines={1}>
                      {diff.subtitle}
                    </Text>
                  </View>
                </View>

                {/* Description and Examples */}
                <Text style={[styles.diffDescText, { color: colors.label }]}>{diff.description}</Text>
                <View style={[styles.diffExamplesBox, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)' }]}>
                  <Text style={[styles.diffExamplesLabel, { color: colors.tertiaryLabel }]}>
                    {t('capitals_examples_label')}
                  </Text>
                  <Text style={[styles.diffExamplesText, { color: colors.secondaryLabel }]}>{diff.examples}</Text>
                </View>

                {/* Bottom CTA bar */}
                <View style={styles.diffCardBottomBar}>
                  <Text style={[styles.diffCardPlayText, { color: diff.color }]}>
                    {t('play_action_play')}
                  </Text>
                  <View style={[styles.diffArrowCircle, { backgroundColor: diff.color }]}>
                    <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Game Start Settings Modal */}
        {pendingDifficulty && (
          <GameStartModal
            visible={pendingDifficulty !== null}
            onClose={() => setPendingDifficulty(null)}
            onStart={(count, timeLimit) => {
              setSelectedQuestionCount(count);
              setQuestionTimeLimit(timeLimit);
              const targetDiff = pendingDifficulty.key;
              setSelectedDifficulty(targetDiff);
              setPendingDifficulty(null);
              startNewRound(targetDiff, count, timeLimit);
              setScreenMode('playing');
            }}
            title={pendingDifficulty.title}
            subtitle={pendingDifficulty.subtitle}
            icon={pendingDifficulty.icon}
            color={pendingDifficulty.color}
            gradient={pendingDifficulty.gradient}
            initialCount={selectedQuestionCount}
            initialTime={questionTimeLimit}
            showTimeSelector={true}
            totalAvailable={pendingDifficulty.key === 'all' ? COUNTRIES.length : undefined}
          />
        )}
      </View>
    );
  }

  if (questions.length === 0) return null;

  const currentDiffConfig = getDiffConfig(CAPITALS_DIFFICULTIES[selectedDifficulty]);
  const currentQ = questions[currentIndex];
  const progress = (currentIndex + 1) / questions.length;

  if (showSummary) {
    const stars = calculateStars(score, questions.length);
    const accuracy = Math.round((score / questions.length) * 100);
    const xpEarned = calculateXpEarned(score, questions.length, highestStreak);

    return (
      <View style={[styles.container, { backgroundColor: colors.systemBackground, paddingTop: topInset, paddingBottom: 85 + insets.bottom }]}>
        <ConfettiView active={showConfetti} onFinish={() => setShowConfetti(false)} />
        <View style={styles.summaryWrap}>
          {/* Difficulty Badge */}
          <View
            style={[
              styles.diffBadgeGameOver,
              {
                borderColor: `${currentDiffConfig.color}40`,
                backgroundColor: `${currentDiffConfig.color}15`,
              },
            ]}
          >
            <Ionicons name={currentDiffConfig.icon} size={15} color={currentDiffConfig.color} />
            <Text style={[styles.diffBadgeGameOverText, { color: currentDiffConfig.color }]}>
              {currentDiffConfig.tag}
            </Text>
          </View>

          <Text style={[styles.summaryPretitle, { color: colors.systemBlue }]}>
            {t('play_mode_capitals_title').toUpperCase()}
          </Text>
          <Text style={[styles.summaryTitle, { color: colors.label }]}>
            {stars === 3 ? t('results_title_perfect') : stars === 2 ? t('results_title_great') : t('results_title_practice')}
          </Text>

          <View style={styles.starsRow}>
            {[1, 2, 3].map((s) => (
              <Ionicons
                key={s}
                name="star"
                size={s === 2 ? 64 : 50}
                color={stars >= s ? colors.goldStar : isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(120, 120, 128, 0.2)'}
                style={s === 2 ? styles.centerStar : undefined}
              />
            ))}
          </View>

          <View style={styles.statCardsGrid}>
            <Pressable
              onPress={() => {
                soundService.triggerLightTap();
                setShowReviewModal(true);
              }}
              style={({ pressed }) => [
                styles.statBox,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.cardBorder,
                  borderWidth: 1,
                },
                colors.cardShadow,
                styles.statBoxInteractive,
                pressed && styles.statBoxPressed,
              ]}
            >
              <View style={styles.reviewBadgeHint}>
                <Ionicons name="eye" size={11} color="#FFFFFF" />
                <Text style={styles.reviewBadgeHintText}>VER</Text>
              </View>
              <Text style={[styles.statNumber, { color: colors.label }]}>{score}/{questions.length}</Text>
              <Text style={[styles.statLabel, { color: colors.systemBlue, fontWeight: '700' }]}>
                {t('quiz_hits_label')}
              </Text>
            </Pressable>

            <View style={[styles.statBox, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1 }, colors.cardShadow]}>
              <Text style={[styles.statNumber, { color: colors.systemGreen }]}>{accuracy}%</Text>
              <Text style={[styles.statLabel, { color: colors.secondaryLabel }]}>{t('quiz_accuracy_label')}</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1 }, colors.cardShadow]}>
              <Text style={[styles.statNumber, { color: colors.systemPurple }]}>+{xpEarned}</Text>
              <Text style={[styles.statLabel, { color: colors.secondaryLabel }]}>{t('quiz_xp_earned_label')}</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1 }, colors.cardShadow]}>
              <Text style={[styles.statNumber, { color: colors.systemOrange }]}>{highestStreak} 🔥</Text>
              <Text style={[styles.statLabel, { color: colors.secondaryLabel }]}>{t('quiz_streak_label')}</Text>
            </View>
          </View>

          <View style={styles.summaryActions}>
            {reviewItems.filter((i) => !i.isCorrect).length > 0 && (
              <AppleButton
                title={t('quiz_btn_review_mistakes', { count: reviewItems.filter((i) => !i.isCorrect).length })}
                onPress={startRetryFailedCapitals}
                variant="gradient"
                style={{ width: '100%', marginBottom: 10 }}
              />
            )}

            <AppleButton
              title={t('quiz_btn_play_again', { count: currentDiffConfig.shortName })}
              onPress={() => startNewRound(selectedDifficulty, selectedQuestionCount)}
              variant={reviewItems.filter((i) => !i.isCorrect).length > 0 ? "secondary" : "gradient"}
              style={{ width: '100%', marginBottom: 8 }}
            />

            {/* Quick Question Count Switcher on Game Over */}
            <View style={styles.summaryCountRow}>
              <Text style={[styles.summaryCountLabel, { color: colors.secondaryLabel }]}>{t('quiz_next_round_questions')}</Text>
              <View style={styles.summaryCountChips}>
                {([10, 20, 50, 'all'] as const).map((cnt) => {
                  const isSel = selectedQuestionCount === cnt;
                  const lbl = cnt === 'all' ? t('game_modal_all_label') : `${cnt}`;
                  return (
                    <Pressable
                      key={String(cnt)}
                      onPress={() => {
                        soundService.triggerSelection();
                        setSelectedQuestionCount(cnt);
                        startNewRound(selectedDifficulty, cnt);
                      }}
                      style={[
                        styles.summaryCountChip,
                        {
                          backgroundColor: colors.cardBackground,
                          borderColor: colors.cardBorder,
                        },
                        isSel && {
                          backgroundColor: colors.systemBlue,
                          borderColor: colors.systemBlue,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.summaryCountChipText,
                          { color: colors.label },
                          isSel && styles.summaryCountChipTextActive,
                        ]}
                      >
                        {lbl}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <AppleButton
              title={t('results_btn_change_diff')}
              onPress={handleBackToDifficulty}
              variant="secondary"
              style={{ width: '100%' }}
            />
          </View>
        </View>

        <ReviewAnswersModal
          visible={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          items={reviewItems}
          title={isRetryRound ? t('quiz_review_retry_title') : `${t('quiz_review_title')} (${currentDiffConfig.shortName})`}
          onRetryFailures={reviewItems.filter((i) => !i.isCorrect).length > 0 ? startRetryFailedCapitals : undefined}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.systemBackground, paddingTop: topInset }]}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerControlRow}>
          <Pressable
            onPress={handleBackToDifficulty}
            style={[styles.backBtn, { backgroundColor: colors.cardBackground }]}
            hitSlop={12}
          >
            <Ionicons name="arrow-back" size={22} color={colors.label} />
          </Pressable>

          <View style={[styles.timerPill, timeLeft <= 4 && styles.timerPillUrgent]}>
            <Ionicons
              name="timer"
              size={15}
              color={timeLeft <= 4 ? '#FF3B30' : currentDiffConfig.color}
            />
            <Text style={[styles.timerText, timeLeft <= 4 && styles.timerTextUrgent]}>
              {timeLeft}s
            </Text>
          </View>

          <View style={styles.headerRight}>
            {hasSecondChance && (
              <View style={styles.shieldPill}>
                <Ionicons name="shield-checkmark" size={13} color="#0284C7" />
                <Text style={styles.shieldPillText}>{t('quiz_second_chance_pill')}</Text>
              </View>
            )}
            <View style={[styles.scorePill, { backgroundColor: isDark ? 'rgba(175, 82, 222, 0.18)' : 'rgba(175, 82, 222, 0.12)' }]}>
              <Ionicons name="trophy" size={13} color={colors.systemPurple} />
              <Text style={[styles.scorePillText, { color: colors.systemPurple }]}>{score} {t('quiz_pts')}</Text>
            </View>
            <StreakBadge streak={streak} size="small" />
          </View>
        </View>

        <View style={styles.progressContainer}>
          <ProgressBar
            progress={progress}
            height={6}
            gradientColors={currentDiffConfig.gradient}
          />
          <Text style={[styles.questionCounter, { color: colors.tertiaryLabel }]}>
            {t('quiz_counter', { current: currentIndex + 1, total: questions.length })}
          </Text>
        </View>

        {isRetryRound && (
          <View style={styles.retryBadgeBar}>
            <Ionicons name="repeat" size={12} color="#D97706" />
            <Text style={styles.retryBadgeBarText}>{t('quiz_mode_retry_badge')}</Text>
          </View>
        )}

        {shieldMessage && (
          <View style={[styles.shieldBanner, shieldMessage.includes('Relámpago') || shieldMessage.includes('Lightning') ? styles.shieldBannerReward : styles.shieldBannerDefend]}>
            <Ionicons
              name={shieldMessage.includes('Relámpago') || shieldMessage.includes('Lightning') ? 'flash' : 'shield-checkmark'}
              size={15}
              color={shieldMessage.includes('Relámpago') || shieldMessage.includes('Lightning') ? '#D97706' : '#0284C7'}
            />
            <Text
              style={[
                styles.shieldBannerText,
                { color: shieldMessage.includes('Relámpago') || shieldMessage.includes('Lightning') ? '#92400E' : '#0369A1' },
              ]}
            >
              {shieldMessage}
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Country Header Card */}
        <Animated.View
          style={[
            styles.countryCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.cardBorder,
              borderWidth: 1,
              transform: [{ scale: cardScale }, { translateX: shakeAnim }],
            },
            colors.cardShadow,
          ]}
        >
          <View style={styles.countryHeaderTopRow}>
            <Text style={[styles.questionSubtitle, { color: colors.secondaryLabel }]}>
              {t('capitals_which_capital', { country: getCountryName(currentQ.country) })}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Pressable
                onPress={() => {
                  toggleVoiceAnnouncer();
                  if (!stats.voiceAnnouncerEnabled && currentQ) {
                    speechService.setEnabled(true);
                    speechService.speakCapitalQuestion(getCountryName(currentQ.country), language);
                  } else {
                    speechService.stop();
                  }
                }}
                style={[
                  styles.voiceQuickBtn,
                  stats.voiceAnnouncerEnabled && styles.voiceQuickBtnActive,
                  {
                    backgroundColor: stats.voiceAnnouncerEnabled
                      ? 'rgba(52, 199, 89, 0.15)'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.04)',
                  },
                ]}
                hitSlop={10}
              >
                <Ionicons
                  name={stats.voiceAnnouncerEnabled ? 'volume-high' : 'volume-mute-outline'}
                  size={18}
                  color={stats.voiceAnnouncerEnabled ? colors.systemGreen : colors.tertiaryLabel}
                />
              </Pressable>

              <Pressable
                onPress={() => {
                  toggleHandsFreeMode();
                  soundService.triggerSelection();
                }}
                style={[
                  styles.voiceQuickBtn,
                  stats.handsFreeModeEnabled && styles.handsFreeQuickBtnActive,
                  {
                    backgroundColor: stats.handsFreeModeEnabled
                      ? 'rgba(48, 176, 199, 0.18)'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.04)',
                    marginLeft: 8,
                  },
                ]}
                hitSlop={10}
              >
                <Ionicons
                  name={stats.handsFreeModeEnabled ? 'mic' : 'mic-off-outline'}
                  size={18}
                  color={stats.handsFreeModeEnabled ? '#30B0C7' : colors.tertiaryLabel}
                />
              </Pressable>
            </View>
          </View>
          <Text style={[styles.countryName, { color: colors.label }]}>{getCountryName(currentQ.country)}</Text>

          <View style={styles.flagContainer}>
            <FlagImage
              countryCode={currentQ.country.code}
              fallbackEmoji={currentQ.country.flagEmoji}
              width={140}
              height={90}
              borderRadius={14}
            />
          </View>

          <View style={[styles.infoPill, { backgroundColor: isDark ? 'rgba(175, 82, 222, 0.18)' : 'rgba(175, 82, 222, 0.1)' }]}>
            <Ionicons name="compass" size={14} color={colors.systemPurple} />
            <Text style={[styles.infoPillText, { color: colors.systemPurple }]}>{getContinentName(currentQ.country.continent)}</Text>
          </View>
        </Animated.View>

        {/* Hands-Free Active Recognition Banner */}
        {Boolean(stats.handsFreeModeEnabled) && !isAnswered && (
          <View
            style={[
              styles.handsFreeLiveBar,
              {
                backgroundColor: isDark ? 'rgba(48, 176, 199, 0.12)' : 'rgba(48, 176, 199, 0.08)',
                borderColor: handsFree.isListening ? '#30B0C7' : colors.separator,
              },
            ]}
          >
            <View style={styles.handsFreeLiveBarLeft}>
              <View
                style={[
                  styles.handsFreeLiveDot,
                  { backgroundColor: handsFree.isListening ? '#34C759' : '#8E8E93' },
                ]}
              />
              <Ionicons
                name={handsFree.isListening ? 'mic' : 'mic-outline'}
                size={16}
                color={handsFree.isListening ? '#30B0C7' : colors.secondaryLabel}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.handsFreeLiveText,
                  { color: handsFree.isListening ? colors.label : colors.secondaryLabel },
                ]}
                numberOfLines={1}
              >
                {handsFree.transcript
                  ? `${t('game_hands_free_heard')} "${handsFree.transcript}"`
                  : handsFree.isListening
                  ? t('game_hands_free_listening')
                  : t('game_hands_free_badge')}
              </Text>
            </View>

            {!handsFree.isNativeAvailable && (
              <Text style={[styles.handsFreeDevNotice, { color: colors.secondaryLabel }]}>
                {t('game_hands_free_dev_notice')}
              </Text>
            )}
          </View>
        )}

        {/* Timeout Loss Warning Banner */}
        {isAnswered && selectedCapital === null && (
          <View style={styles.timeoutBanner}>
            <View style={styles.timeoutBannerIconWrap}>
              <Ionicons name="timer" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.timeoutBannerTextWrap}>
              <Text style={styles.timeoutBannerTitle}>{t('quiz_timeout_title')}</Text>
              <Text style={styles.timeoutBannerSubtitle}>
                {t('quiz_timeout_subtitle')}
              </Text>
            </View>
          </View>
        )}

        {/* Capital Choices */}
        <View style={styles.choicesList}>
          {currentQ.options.map((cap) => {
            const isSelected = selectedCapital === cap;
            const isCorrect = cap === currentQ.correctCapital;
            const isTimeout = isAnswered && selectedCapital === null;
            const isEliminated = eliminatedCapitals.includes(cap);

            let cardStyle: any = {
              backgroundColor: colors.cardBackground,
              borderColor: colors.cardBorder,
            };
            let iconName: keyof typeof Ionicons.glyphMap | null = null;
            let iconColor = colors.secondaryLabel;

            if (isEliminated) {
              cardStyle = {
                backgroundColor: isDark ? 'rgba(255, 59, 48, 0.12)' : 'rgba(255, 59, 48, 0.06)',
                borderColor: isDark ? 'rgba(255, 59, 48, 0.35)' : 'rgba(255, 59, 48, 0.25)',
                opacity: 0.65,
              };
              iconName = 'close-circle';
              iconColor = colors.systemRed;
            } else if (isAnswered) {
              if (isTimeout) {
                if (isCorrect) {
                  cardStyle = {
                    backgroundColor: isDark ? 'rgba(255, 159, 10, 0.18)' : 'rgba(255, 149, 0, 0.08)',
                    borderColor: colors.systemOrange,
                    borderWidth: 1.5,
                  };
                } else {
                  cardStyle = {
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.cardBorder,
                    opacity: 0.45,
                  };
                }
              } else if (isCorrect) {
                cardStyle = {
                  backgroundColor: colors.correctCardBackground,
                  borderColor: colors.systemGreen,
                  borderWidth: 1.5,
                };
                iconName = 'checkmark-circle';
                iconColor = colors.systemGreen;
              } else if (isSelected) {
                cardStyle = {
                  backgroundColor: colors.wrongCardBackground,
                  borderColor: colors.systemRed,
                  borderWidth: 1.5,
                };
                iconName = 'close-circle';
                iconColor = colors.systemRed;
              }
            }

            return (
              <Pressable
                key={cap}
                onPress={() => handleSelectCapital(cap)}
                disabled={isAnswered || isEliminated}
                style={[
                  styles.choiceCard,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.cardBorder,
                  },
                  colors.cardShadow,
                  cardStyle,
                ]}
              >
                <View style={styles.choiceRow}>
                  <Ionicons
                    name="business-outline"
                    size={20}
                    color={
                      isEliminated
                        ? colors.systemRed
                        : isAnswered && !isTimeout && isCorrect
                        ? colors.systemGreen
                        : isAnswered && isSelected
                        ? colors.systemRed
                        : isTimeout && isCorrect
                        ? '#D97706'
                        : isTimeout
                        ? colors.tertiaryLabel
                        : colors.systemPurple
                    }
                    style={{ marginRight: 12 }}
                  />
                  <Text
                    style={[
                      styles.choiceText,
                      { color: colors.label },
                      isEliminated && styles.textEliminated,
                      isAnswered && !isTimeout && isCorrect && { color: colors.systemGreen },
                      isAnswered && isSelected && !isCorrect && { color: colors.systemRed },
                      isTimeout && isCorrect && styles.textTimeoutReveal,
                      isTimeout && !isCorrect && { color: colors.tertiaryLabel },
                    ]}
                  >
                    {cap}
                  </Text>
                </View>
                {isEliminated ? (
                  <View style={styles.eliminatedBadge}>
                    <Ionicons name="shield" size={11} color={colors.systemRed} />
                    <Text style={styles.eliminatedBadgeText}>{t('quiz_eliminated_badge')}</Text>
                  </View>
                ) : isTimeout && isCorrect ? (
                  <View style={styles.timeoutAnswerBadge}>
                    <Ionicons name="information-circle" size={13} color="#D97706" />
                    <Text style={styles.timeoutAnswerBadgeText}>{t('quiz_timeout_reveal')}</Text>
                  </View>
                ) : !isTimeout && iconName ? (
                  <Ionicons name={iconName} size={22} color={iconColor} />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {/* Country Fact Sheet */}
        {isAnswered && (
          <View style={[styles.factCard, { backgroundColor: colors.cardBackground, borderColor: isDark ? 'rgba(175, 82, 222, 0.3)' : 'rgba(175, 82, 222, 0.15)', borderWidth: 1 }, colors.cardShadow]}>
            <View style={styles.factHeader}>
              <Ionicons name="sparkles" size={16} color={colors.systemPurple} />
              <Text style={[styles.factTitle, { color: colors.systemPurple }]}>{t('review_card_fact_title')}</Text>
            </View>
            <Text style={[styles.factBody, { color: colors.label }]}>{getCountryFact(currentQ.country)}</Text>
          </View>
        )}

        {/* Auto Advance Indicator - Tapping advances instantly */}
        {isAnswered && (
          <Pressable
            onPress={handleNext}
            style={({ pressed }) => [
              styles.autoAdvanceCard,
              {
                backgroundColor: colors.cardBackground,
                borderColor: isDark ? 'rgba(175, 82, 222, 0.35)' : 'rgba(175, 82, 222, 0.2)',
              },
              colors.cardShadow,
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
          >
            <View style={styles.autoAdvanceContent}>
              <View style={styles.autoAdvanceLeft}>
                <View
                  style={[
                    styles.flashCircle,
                    {
                      backgroundColor:
                        selectedCapital === null
                          ? 'rgba(255, 59, 48, 0.14)'
                          : selectedCapital === currentQ.correctCapital
                          ? 'rgba(52, 199, 89, 0.12)'
                          : 'rgba(255, 149, 0, 0.12)',
                    },
                  ]}
                >
                  <Ionicons
                    name={selectedCapital === null ? 'timer-outline' : 'flash'}
                    size={14}
                    color={
                      selectedCapital === null
                        ? colors.systemRed
                        : selectedCapital === currentQ.correctCapital
                        ? colors.systemGreen
                        : colors.systemOrange
                    }
                  />
                </View>
                <View style={styles.autoAdvanceTextWrap}>
                  <Text
                    style={[
                      styles.autoAdvanceTitle,
                      { color: colors.label },
                      selectedCapital === null && { color: colors.systemRed },
                    ]}
                    numberOfLines={1}
                  >
                    {selectedCapital === null
                      ? t('quiz_time_out')
                      : currentIndex + 1 < questions.length
                      ? t('quiz_next_question')
                      : t('quiz_see_results')}
                  </Text>
                  <Text style={[styles.autoAdvanceSubtitle, { color: colors.secondaryLabel }]} numberOfLines={1}>
                    {selectedCapital === null ? t('quiz_moving_next') : t('quiz_auto_advancing')}
                  </Text>
                </View>
              </View>

              <View style={[styles.skipBtnPill, { backgroundColor: isDark ? 'rgba(175, 82, 222, 0.2)' : 'rgba(175, 82, 222, 0.1)' }]}>
                <Text style={[styles.skipBtnText, { color: colors.systemPurple }]}>{t('quiz_skip')}</Text>
                <Ionicons name="arrow-forward" size={12} color={colors.systemPurple} style={{ marginLeft: 3 }} />
              </View>
            </View>

            {/* Micro timer track */}
            <View style={[styles.countdownTrack, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]}>
              <Animated.View
                style={[
                  styles.countdownFill,
                  {
                    width: countdownAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                    backgroundColor:
                      selectedCapital === currentQ.correctCapital
                        ? colors.systemGreen
                        : colors.systemPurple,
                  },
                ]}
              />
            </View>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: IOSColors.systemBackground,
  },
  safeArea: {
    flex: 1,
    backgroundColor: IOSColors.systemBackground,
  },
  topHeader: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
  },
  headerControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...IOSColors.cardShadow,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  timerPillUrgent: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.4)',
  },
  timerText: {
    fontSize: 13,
    fontWeight: '800',
    color: IOSColors.systemBlue,
  },
  timerTextUrgent: {
    color: '#FF3B30',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(175, 82, 222, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scorePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: IOSColors.systemPurple,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  questionCounter: {
    fontSize: 11,
    fontWeight: '700',
    color: IOSColors.tertiaryLabel,
    marginTop: 4,
  },
  streakWrap: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  countryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
    ...IOSColors.cardShadow,
  },
  countryHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 6,
  },
  questionSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: IOSColors.secondaryLabel,
    flex: 1,
    paddingRight: 8,
  },
  voiceQuickBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceQuickBtnActive: {
    borderWidth: 1.5,
    borderColor: 'rgba(52, 199, 89, 0.4)',
  },
  handsFreeQuickBtnActive: {
    borderWidth: 1.5,
    borderColor: '#30B0C7',
  },
  handsFreeLiveBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  handsFreeLiveBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  handsFreeLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  handsFreeLiveText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  handsFreeDevNotice: {
    fontSize: 11,
    fontWeight: '500',
    fontStyle: 'italic',
    marginLeft: 6,
  },
  countryName: {
    fontSize: 28,
    fontWeight: '800',
    color: IOSColors.label,
    letterSpacing: -0.4,
    marginBottom: 16,
    textAlign: 'center',
  },
  flagContainer: {
    marginBottom: 14,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(175, 82, 222, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  infoPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: IOSColors.systemPurple,
    marginLeft: 5,
  },
  choicesList: {
    gap: 12,
  },
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    ...IOSColors.cardShadow,
  },
  choiceNormal: {},
  choiceCorrect: {
    backgroundColor: IOSColors.correctCardBackground,
    borderColor: IOSColors.systemGreen,
    elevation: 2,
  },
  choiceWrong: {
    backgroundColor: IOSColors.wrongCardBackground,
    borderColor: IOSColors.systemRed,
    elevation: 2,
  },
  choiceTimeoutReveal: {
    backgroundColor: 'rgba(255, 149, 0, 0.08)',
    borderColor: '#FF9500',
    borderWidth: 1.5,
  },
  choiceDimmed: {
    opacity: 0.45,
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  choiceText: {
    fontSize: 16,
    fontWeight: '600',
    color: IOSColors.label,
    flex: 1,
    minWidth: 0,
  },
  textCorrect: {
    color: IOSColors.systemGreen,
  },
  textWrong: {
    color: IOSColors.systemRed,
  },
  textTimeoutReveal: {
    color: '#D97706',
    fontWeight: '700',
  },
  textDimmed: {
    color: IOSColors.tertiaryLabel,
  },
  timeoutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 16,
    ...IOSColors.cardShadow,
  },
  timeoutBannerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  timeoutBannerTextWrap: {
    flex: 1,
  },
  timeoutBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  timeoutBannerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
    fontWeight: '500',
  },
  timeoutAnswerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timeoutAnswerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
    marginLeft: 3,
  },
  factCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: 'rgba(175, 82, 222, 0.2)',
    ...IOSColors.cardShadow,
  },
  factHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  factTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: IOSColors.systemPurple,
    marginLeft: 6,
  },
  factBody: {
    fontSize: 14,
    color: IOSColors.label,
    lineHeight: 20,
  },
  nextActionWrap: {
    marginTop: 20,
    width: '100%',
  },
  summaryWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  summaryPretitle: {
    fontSize: 13,
    fontWeight: '700',
    color: IOSColors.systemPurple,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  summaryTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: IOSColors.label,
    marginBottom: 20,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  centerStar: {
    marginHorizontal: 16,
    top: -10,
  },
  statCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 32,
    gap: 12,
  },
  statBox: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    ...IOSColors.cardShadow,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: IOSColors.label,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: IOSColors.secondaryLabel,
    fontWeight: '500',
  },
  // Auto advance prompt styles
  autoAdvanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: 'rgba(175, 82, 222, 0.22)',
    overflow: 'hidden',
    ...IOSColors.cardShadow,
  },
  autoAdvanceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  autoAdvanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  flashCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  autoAdvanceTextWrap: {
    flex: 1,
  },
  autoAdvanceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: IOSColors.label,
    letterSpacing: -0.2,
  },
  autoAdvanceSubtitle: {
    fontSize: 11,
    color: IOSColors.secondaryLabel,
    fontWeight: '500',
    marginTop: 1,
  },
  skipBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(175, 82, 222, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    flexShrink: 0,
  },
  skipBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: IOSColors.systemPurple,
  },
  countdownTrack: {
    height: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    width: '100%',
  },
  countdownFill: {
    height: '100%',
  },
  // Interactive Stat Card styles
  statBoxInteractive: {
    position: 'relative',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  statBoxPressed: {
    transform: [{ scale: 0.96 }],
    backgroundColor: '#F0F8FF',
  },
  reviewBadgeHint: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: IOSColors.systemBlue,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  reviewBadgeHintText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  // Difficulty Selection Styles
  diffHeaderBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
  },
  diffHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  diffPretitle: {
    fontSize: 11,
    fontWeight: '800',
    color: IOSColors.systemPurple,
    letterSpacing: 1.4,
    flex: 1,
    marginRight: 8,
  },
  diffTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: IOSColors.label,
    letterSpacing: -0.4,
  },

  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(175, 82, 222, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  xpPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: IOSColors.systemPurple,
    marginLeft: 4,
  },
  diffScroll: {
    flex: 1,
  },
  diffScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  diffSubtitle: {
    fontSize: 14,
    color: IOSColors.secondaryLabel,
    lineHeight: 20,
    marginBottom: 18,
  },
  diffCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    ...IOSColors.cardShadow,
  },
  diffCardFeatured: {
    borderColor: 'rgba(255, 149, 0, 0.45)',
    borderWidth: 2,
  },
  diffCardHard: {
    borderColor: 'rgba(255, 59, 48, 0.4)',
  },
  diffCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  diffIconGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  diffCardHeadText: {
    flex: 1,
    justifyContent: 'center',
  },
  diffTagAndStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  diffStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  diffBestScoreText: {
    fontSize: 11,
    fontWeight: '700',
    color: IOSColors.systemGreen,
  },
  starsRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  diffTagBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  diffTagBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  diffCardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: IOSColors.label,
    marginBottom: 2,
  },
  diffCardSubtitle: {
    fontSize: 13,
    color: IOSColors.secondaryLabel,
    fontWeight: '500',
  },
  diffDescText: {
    fontSize: 13,
    color: IOSColors.label,
    marginTop: 12,
    lineHeight: 18,
  },
  diffExamplesBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  diffExamplesLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: IOSColors.tertiaryLabel,
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  diffExamplesText: {
    fontSize: 12,
    color: IOSColors.secondaryLabel,
    fontStyle: 'italic',
  },
  diffCardBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  diffCardPlayText: {
    fontSize: 14,
    fontWeight: '700',
  },
  diffArrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  diffBadgeGameOver: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  diffBadgeGameOverText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  summaryActions: {
    width: '100%',
    marginTop: 6,
  },
  summaryCountRow: {
    width: '100%',
    marginVertical: 10,
    alignItems: 'center',
  },
  summaryCountLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: IOSColors.secondaryLabel,
    marginBottom: 8,
  },
  summaryCountChips: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  summaryCountChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  summaryCountChipActive: {
    backgroundColor: IOSColors.systemPurple,
    borderColor: IOSColors.systemPurple,
  },
  summaryCountChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: IOSColors.label,
  },
  summaryCountChipTextActive: {
    color: '#FFFFFF',
  },
  shieldPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.3)',
    gap: 4,
  },
  shieldPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  retryBadgeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginTop: 6,
    gap: 5,
    alignSelf: 'center',
  },
  retryBadgeBarText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.5,
  },
  shieldBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderWidth: 1,
    gap: 7,
  },
  shieldBannerReward: {
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  shieldBannerDefend: {
    backgroundColor: 'rgba(2, 132, 199, 0.14)',
    borderColor: 'rgba(2, 132, 199, 0.35)',
  },
  shieldBannerText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  choiceEliminated: {
    backgroundColor: 'rgba(255, 59, 48, 0.06)',
    borderColor: 'rgba(255, 59, 48, 0.25)',
    opacity: 0.65,
  },
  textEliminated: {
    color: IOSColors.systemRed,
    textDecorationLine: 'line-through',
  },
  eliminatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    gap: 4,
  },
  eliminatedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: IOSColors.systemRed,
  },
});
