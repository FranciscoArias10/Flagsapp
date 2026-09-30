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
import { calculateStars, calculateXpEarned } from '../utils/quizGenerator';
import { IOSColors } from '../utils/colors';
import { soundService } from '../utils/soundHelper';
import { FlagImage } from '../components/FlagImage';
import { ProgressBar } from '../components/ProgressBar';
import { AppleButton } from '../components/AppleButton';
import { StreakBadge } from '../components/StreakBadge';
import { ConfettiView } from '../components/ConfettiView';
import { ReviewAnswersModal } from '../components/ReviewAnswersModal';
import { GameStartModal } from '../components/GameStartModal';
import { useGame } from '../context/GameContext';

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
  const { recordAnswer, recordQuizResult, stats } = useGame();

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
      soundService.triggerLightTap();
    }
  }, [timeLeft, isAnswered, screenMode, questions.length, showSummary]);

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
      const sameContinentCapitals = pool
        .filter((c) => c.capital !== country.capital)
        .map((c) => c.capital);
      const fallbackCapitals = COUNTRIES
        .filter((c) => c.capital !== country.capital)
        .map((c) => c.capital);
      const distractorPool = sameContinentCapitals.length >= 3 ? sameContinentCapitals : fallbackCapitals;

      const otherCapitals = shuffleArray(distractorPool).slice(0, 3);
      const options = shuffleArray([country.capital, ...otherCapitals]);

      return {
        country,
        options,
        correctCapital: country.capital,
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
    setQuestions(qs);
    setCurrentIndex(0);
    setSelectedCapital(null);
    setIsAnswered(false);
    setScore(0);
    setStreak(0);
    setHighestStreak(0);
    setReviewItems([]);
    setShowSummary(false);
    setShowConfetti(false);
    setShowReviewModal(false);
    animateCard();
  };

  const handleStartWithDifficulty = (diffKey: CapitalDifficulty) => {
    soundService.triggerMediumTap();
    setPendingDifficulty(CAPITALS_DIFFICULTIES[diffKey]);
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
        countryName: currentQ.country.name,
        countryCode: currentQ.country.code,
        userAnswer: 'Tiempo agotado ⏱️',
        correctAnswer: currentQ.correctCapital,
        isCorrect: false,
        fact: currentQ.country.fact,
      },
    ]);

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
    if (isAnswered) return;
    if (questionTimerRef.current) {
      clearInterval(questionTimerRef.current);
      questionTimerRef.current = null;
    }

    setSelectedCapital(cap);
    setIsAnswered(true);

    const currentQ = questions[currentIndex];
    const isCorrect = cap === currentQ.correctCapital;

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

    recordAnswer(isCorrect);

    if (isCorrect) {
      soundService.triggerSuccess();
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setHighestStreak((prev) => Math.max(prev, nextStreak));
      setScore((prev) => prev + 1);
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

    recordQuizResult(result, selectedDifficulty, 'capitals');
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
            color={stars >= s ? IOSColors.goldStar : 'rgba(120, 120, 128, 0.25)'}
          />
        ))}
      </View>
    );
  };

  // 1. DIFFICULTY SELECTION SCREEN
  if (screenMode === 'difficulty_select') {
    return (
      <View style={[styles.container, { paddingTop: topInset, paddingBottom: Math.max(insets.bottom, 20) }]}>
        {/* Header bar */}
        <View style={styles.diffHeaderBar}>
          <View style={styles.diffHeaderTopRow}>
            <Text style={styles.diffPretitle}>TRIVIA & APRENDIZAJE</Text>
            <View style={styles.headerRight}>
              <StreakBadge streak={stats.streak} size="small" />
              <View style={styles.xpPill}>
                <Ionicons name="sparkles" size={13} color={IOSColors.systemPurple} />
                <Text style={styles.xpPillText}>{stats.xp} XP</Text>
              </View>
            </View>
          </View>
          <Text style={styles.diffTitle} numberOfLines={1} adjustsFontSizeToFit>
            Capitales del Mundo
          </Text>
        </View>

        <ScrollView
          style={styles.diffScroll}
          contentContainerStyle={[styles.diffScrollContent, { paddingBottom: 100 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.diffSubtitle}>
            Selecciona un nivel de dificultad para poner a prueba tu conocimiento geográfico:
          </Text>

          {/* Cards for each difficulty */}
          {(Object.keys(CAPITALS_DIFFICULTIES) as CapitalDifficulty[]).map((key) => {
            const diff = CAPITALS_DIFFICULTIES[key];
            const isFeatured = key === 'medium';
            const isHard = key === 'hard';
            const prog = stats.capitalsProgress?.[diff.key] || { correct: 0, total: 0, stars: 0, bestScore: 0 };

            return (
              <Pressable
                key={diff.key}
                onPress={() => handleStartWithDifficulty(diff.key)}
                style={({ pressed }) => [
                  styles.diffCard,
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
                          <Text style={styles.diffBestScoreText}>Mejor: {prog.bestScore} pts</Text>
                        )}
                      </View>
                    </View>
                    <Text style={styles.diffCardTitle} numberOfLines={1} adjustsFontSizeToFit>
                      {diff.title}
                    </Text>
                    <Text style={styles.diffCardSubtitle} numberOfLines={1}>
                      {diff.subtitle}
                    </Text>
                  </View>
                </View>

                {/* Description and Examples */}
                <Text style={styles.diffDescText}>{diff.description}</Text>
                <View style={styles.diffExamplesBox}>
                  <Text style={styles.diffExamplesLabel}>EJEMPLOS:</Text>
                  <Text style={styles.diffExamplesText}>{diff.examples}</Text>
                </View>

                {/* Bottom CTA bar */}
                <View style={styles.diffCardBottomBar}>
                  <Text style={[styles.diffCardPlayText, { color: diff.color }]}>Toca para comenzar</Text>
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

  const currentDiffConfig = CAPITALS_DIFFICULTIES[selectedDifficulty];
  const currentQ = questions[currentIndex];
  const progress = (currentIndex + 1) / questions.length;

  if (showSummary) {
    const stars = calculateStars(score, questions.length);
    const accuracy = Math.round((score / questions.length) * 100);
    const xpEarned = calculateXpEarned(score, questions.length, highestStreak);

    return (
      <View style={[styles.container, { paddingTop: topInset, paddingBottom: 85 + insets.bottom }]}>
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
              DIFICULTAD: {currentDiffConfig.shortName.toUpperCase()}
            </Text>
          </View>

          <Text style={styles.summaryPretitle}>MODO CAPITALES</Text>
          <Text style={styles.summaryTitle}>
            {stars === 3 ? '¡Maestro Geográfico!' : stars === 2 ? '¡Muy Bien!' : '¡A Seguir Explorando!'}
          </Text>

          <View style={styles.starsRow}>
            {[1, 2, 3].map((s) => (
              <Ionicons
                key={s}
                name="star"
                size={s === 2 ? 64 : 50}
                color={stars >= s ? IOSColors.goldStar : 'rgba(120, 120, 128, 0.2)'}
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
                styles.statBoxInteractive,
                pressed && styles.statBoxPressed,
              ]}
            >
              <View style={styles.reviewBadgeHint}>
                <Ionicons name="eye" size={11} color="#FFFFFF" />
                <Text style={styles.reviewBadgeHintText}>VER</Text>
              </View>
              <Text style={styles.statNumber}>{score}/{questions.length}</Text>
              <Text style={[styles.statLabel, { color: IOSColors.systemBlue, fontWeight: '700' }]}>
                Aciertos 👆
              </Text>
            </Pressable>

            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: IOSColors.systemGreen }]}>{accuracy}%</Text>
              <Text style={styles.statLabel}>Precisión</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: IOSColors.systemPurple }]}>+{xpEarned}</Text>
              <Text style={styles.statLabel}>XP Ganada</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: IOSColors.systemOrange }]}>{highestStreak} 🔥</Text>
              <Text style={styles.statLabel}>Racha</Text>
            </View>
          </View>

          <View style={styles.summaryActions}>
            <AppleButton
              title={`Jugar de Nuevo (${currentDiffConfig.shortName})`}
              onPress={() => startNewRound(selectedDifficulty, selectedQuestionCount)}
              variant="gradient"
              style={{ width: '100%', marginBottom: 8 }}
            />

            {/* Quick Question Count Switcher on Game Over */}
            <View style={styles.summaryCountRow}>
              <Text style={styles.summaryCountLabel}>Preguntas para la próxima ronda:</Text>
              <View style={styles.summaryCountChips}>
                {([10, 20, 50, 'all'] as const).map((cnt) => {
                  const isSel = selectedQuestionCount === cnt;
                  const lbl = cnt === 'all' ? 'Todas' : `${cnt}`;
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
                        isSel && styles.summaryCountChipActive,
                      ]}
                    >
                      <Text style={[styles.summaryCountChipText, isSel && styles.summaryCountChipTextActive]}>
                        {lbl}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <AppleButton
              title="Cambiar Dificultad"
              onPress={() => {
                soundService.triggerLightTap();
                setShowSummary(false);
                setScreenMode('difficulty_select');
              }}
              variant="secondary"
              style={{ width: '100%' }}
            />
          </View>
        </View>

        <ReviewAnswersModal
          visible={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          items={reviewItems}
          title={`Recuento de Capitales (${currentDiffConfig.shortName})`}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerControlRow}>
          <Pressable
            onPress={() => {
              soundService.triggerLightTap();
              setScreenMode('difficulty_select');
            }}
            style={styles.backBtn}
            hitSlop={12}
          >
            <Ionicons name="arrow-back" size={22} color={IOSColors.label} />
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
            <View style={styles.scorePill}>
              <Ionicons name="trophy" size={13} color={IOSColors.systemPurple} />
              <Text style={styles.scorePillText}>{score} pts</Text>
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
          <Text style={styles.questionCounter}>
            {currentIndex + 1} de {questions.length}
          </Text>
        </View>
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
              transform: [{ scale: cardScale }, { translateX: shakeAnim }],
            },
          ]}
        >
          <Text style={styles.questionSubtitle}>¿Cuál es su capital?</Text>
          <Text style={styles.countryName}>{currentQ.country.name}</Text>

          <View style={styles.flagContainer}>
            <FlagImage
              countryCode={currentQ.country.code}
              fallbackEmoji={currentQ.country.flagEmoji}
              width={140}
              height={90}
              borderRadius={14}
            />
          </View>

          <View style={styles.infoPill}>
            <Ionicons name="compass" size={14} color={IOSColors.systemPurple} />
            <Text style={styles.infoPillText}>{currentQ.country.continent}</Text>
          </View>
        </Animated.View>

        {/* Timeout Loss Warning Banner */}
        {isAnswered && selectedCapital === null && (
          <View style={styles.timeoutBanner}>
            <View style={styles.timeoutBannerIconWrap}>
              <Ionicons name="timer" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.timeoutBannerTextWrap}>
              <Text style={styles.timeoutBannerTitle}>¡Tiempo Agotado! (0 pts)</Text>
              <Text style={styles.timeoutBannerSubtitle}>
                Perdiste este turno por no responder a tiempo.
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

            let cardStyle: any = styles.choiceNormal;
            let iconName: keyof typeof Ionicons.glyphMap | null = null;
            let iconColor = IOSColors.secondaryLabel;

            if (isAnswered) {
              if (isTimeout) {
                if (isCorrect) {
                  cardStyle = styles.choiceTimeoutReveal;
                } else {
                  cardStyle = styles.choiceDimmed;
                }
              } else if (isCorrect) {
                cardStyle = styles.choiceCorrect;
                iconName = 'checkmark-circle';
                iconColor = IOSColors.systemGreen;
              } else if (isSelected) {
                cardStyle = styles.choiceWrong;
                iconName = 'close-circle';
                iconColor = IOSColors.systemRed;
              }
            }

            return (
              <Pressable
                key={cap}
                onPress={() => handleSelectCapital(cap)}
                disabled={isAnswered}
                style={[styles.choiceCard, cardStyle]}
              >
                <View style={styles.choiceRow}>
                  <Ionicons
                    name="business-outline"
                    size={20}
                    color={
                      isAnswered && !isTimeout && isCorrect
                        ? IOSColors.systemGreen
                        : isAnswered && isSelected
                        ? IOSColors.systemRed
                        : isTimeout && isCorrect
                        ? '#D97706'
                        : isTimeout
                        ? IOSColors.tertiaryLabel
                        : IOSColors.systemPurple
                    }
                    style={{ marginRight: 12 }}
                  />
                  <Text
                    style={[
                      styles.choiceText,
                      isAnswered && !isTimeout && isCorrect && styles.textCorrect,
                      isAnswered && isSelected && !isCorrect && styles.textWrong,
                      isTimeout && isCorrect && styles.textTimeoutReveal,
                      isTimeout && !isCorrect && styles.textDimmed,
                    ]}
                  >
                    {cap}
                  </Text>
                </View>
                {isTimeout && isCorrect ? (
                  <View style={styles.timeoutAnswerBadge}>
                    <Ionicons name="information-circle" size={13} color="#D97706" />
                    <Text style={styles.timeoutAnswerBadgeText}>Era la correcta</Text>
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
          <View style={styles.factCard}>
            <View style={styles.factHeader}>
              <Ionicons name="sparkles" size={16} color={IOSColors.systemPurple} />
              <Text style={styles.factTitle}>Dato del País</Text>
            </View>
            <Text style={styles.factBody}>{currentQ.country.fact}</Text>
          </View>
        )}

        {/* Auto Advance Indicator - Tapping advances instantly */}
        {isAnswered && (
          <Pressable
            onPress={handleNext}
            style={({ pressed }) => [
              styles.autoAdvanceCard,
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
                        ? IOSColors.systemRed
                        : selectedCapital === currentQ.correctCapital
                        ? IOSColors.systemGreen
                        : IOSColors.systemOrange
                    }
                  />
                </View>
                <View style={styles.autoAdvanceTextWrap}>
                  <Text
                    style={[
                      styles.autoAdvanceTitle,
                      selectedCapital === null && { color: IOSColors.systemRed },
                    ]}
                    numberOfLines={1}
                  >
                    {selectedCapital === null
                      ? 'Tiempo Agotado'
                      : currentIndex + 1 < questions.length
                      ? 'Siguiente Capital'
                      : 'Ver Puntuación'}
                  </Text>
                  <Text style={styles.autoAdvanceSubtitle} numberOfLines={1}>
                    {selectedCapital === null ? 'Pasando a la siguiente...' : 'Avanzando automáticamente'}
                  </Text>
                </View>
              </View>

              <View style={styles.skipBtnPill}>
                <Text style={styles.skipBtnText}>Saltar</Text>
                <Ionicons name="arrow-forward" size={12} color={IOSColors.systemPurple} style={{ marginLeft: 3 }} />
              </View>
            </View>

            {/* Micro timer track */}
            <View style={styles.countdownTrack}>
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
                        ? IOSColors.systemGreen
                        : IOSColors.systemPurple,
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
  questionSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: IOSColors.secondaryLabel,
    marginBottom: 4,
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
    fontSize: 17,
    fontWeight: '600',
    color: IOSColors.label,
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
});
