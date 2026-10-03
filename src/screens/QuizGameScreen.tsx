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
import { Ionicons } from '@expo/vector-icons';
import { Country, QuizQuestion, QuizResult, Continent, AnswerReviewItem } from '../types';
import { generateQuizQuestions, generateQuizQuestionsFromCountries, calculateStars, calculateXpEarned } from '../utils/quizGenerator';
import { COUNTRIES } from '../data/countries';
import { IOSColors } from '../utils/colors';
import { soundService } from '../utils/soundHelper';
import { FlagImage } from '../components/FlagImage';
import { ProgressBar } from '../components/ProgressBar';
import { AppleButton } from '../components/AppleButton';
import { StreakBadge } from '../components/StreakBadge';
import { ConfettiView } from '../components/ConfettiView';
import { ReviewAnswersModal } from '../components/ReviewAnswersModal';
import { useGame } from '../context/GameContext';

interface QuizGameScreenProps {
  continent?: Continent | 'Mundo';
  initialQuestionCount?: number | 'all';
  initialTimeLimit?: number;
  onClose: () => void;
}

export const QuizGameScreen: React.FC<QuizGameScreenProps> = ({
  continent = 'Mundo',
  initialQuestionCount = 10,
  initialTimeLimit = 15,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) : 0);
  const { recordAnswer, recordGameStart, recordQuizResult, stats } = useGame();
  const hasCountedGameRef = useRef(false);

  const [questionCount, setQuestionCount] = useState<number | 'all'>(initialQuestionCount);
  const [questionTimeLimit, setQuestionTimeLimit] = useState<number>(initialTimeLimit);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [highestStreak, setHighestStreak] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [reviewItems, setReviewItems] = useState<AnswerReviewItem[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Retry & Second Chance mechanics
  const [isRetryRound, setIsRetryRound] = useState(false);
  const [hasSecondChance, setHasSecondChance] = useState(false);
  const [shieldMessage, setShieldMessage] = useState<string | null>(null);
  const [eliminatedOptions, setEliminatedOptions] = useState<number[]>([]);
  const questionStartTimeRef = useRef<number>(Date.now());

  const [timeLeft, setTimeLeft] = useState(initialTimeLimit);
  const questionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownAnim = useRef(new Animated.Value(0)).current;

  // Animations
  const cardScale = useRef(new Animated.Value(0.92)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Star animations in summary
  const star1Scale = useRef(new Animated.Value(0)).current;
  const star2Scale = useRef(new Animated.Value(0)).current;
  const star3Scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setQuestionCount(initialQuestionCount);
    setQuestionTimeLimit(initialTimeLimit);
    startNewGame(initialQuestionCount, initialTimeLimit);
  }, [continent, initialQuestionCount, initialTimeLimit]);

  // Question countdown timer interval (pure state update only)
  useEffect(() => {
    if (questions.length === 0 || showSummary || isAnswered) {
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
  }, [currentIndex, questions.length, showSummary, isAnswered, questionTimeLimit]);

  // Handle timeout safely in an effect hook (avoids updating GameProvider during render)
  useEffect(() => {
    if (questions.length === 0 || showSummary || isAnswered) {
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
  }, [timeLeft, isAnswered, questions.length, showSummary]);

  const startNewGame = (countParam = questionCount, timeParam = questionTimeLimit) => {
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
    setTimeLeft(timeParam);
    const targetCount = countParam === 'all' ? 999 : countParam;
    const generated = generateQuizQuestions(targetCount, continent, 'flag_to_name');
    setIsRetryRound(false);
    hasCountedGameRef.current = false;
    setQuestions(generated);
    setCurrentIndex(0);
    setSelectedOptionIndex(null);
    setIsAnswered(false);
    setEliminatedOptions([]);
    setHasSecondChance(false);
    setShieldMessage(null);
    setScore(0);
    setCurrentStreak(0);
    setHighestStreak(0);
    setReviewItems([]);
    setShowSummary(false);
    setShowConfetti(false);
    setShowReviewModal(false);
    questionStartTimeRef.current = Date.now();
    animateQuestionIn();
  };

  const startRetryFailedQuestions = () => {
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
    const retryQs = generateQuizQuestionsFromCountries(failedCountries, 'flag_to_name', continent);

    setIsRetryRound(true);
    hasCountedGameRef.current = false;
    setQuestions(retryQs);
    setCurrentIndex(0);
    setSelectedOptionIndex(null);
    setIsAnswered(false);
    setEliminatedOptions([]);
    setHasSecondChance(false);
    setShieldMessage(null);
    setScore(0);
    setCurrentStreak(0);
    setHighestStreak(0);
    setReviewItems([]);
    setShowSummary(false);
    setShowConfetti(false);
    setShowReviewModal(false);
    questionStartTimeRef.current = Date.now();
    animateQuestionIn();
  };

  const animateQuestionIn = () => {
    cardScale.setValue(0.92);
    cardOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleTimeout = () => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedOptionIndex(null);

    const currentQ = questions[currentIndex];
    if (!currentQ) return;
    const correctAnswer = currentQ.options[currentQ.correctOptionIndex]?.name || '';

    setReviewItems((prev) => [
      ...prev,
      {
        id: currentQ.id || `${currentQ.targetCountry.code}-${currentIndex}`,
        flagEmoji: currentQ.targetCountry.flagEmoji,
        countryName: currentQ.targetCountry.name,
        countryCode: currentQ.targetCountry.code,
        userAnswer: 'Tiempo agotado ⏱️',
        correctAnswer,
        isCorrect: false,
        fact: currentQ.targetCountry.fact,
      },
    ]);

    if (!hasCountedGameRef.current) {
      recordGameStart();
      hasCountedGameRef.current = true;
    }
    recordAnswer(false);
    soundService.triggerError();
    triggerShake();
    setCurrentStreak(0);

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

  const handleSelectOption = (index: number) => {
    if (isAnswered || eliminatedOptions.includes(index)) return;

    const currentQ = questions[currentIndex];
    const isCorrect = index === currentQ.correctOptionIndex;
    const fastOpportunityEnabled = stats.fastAnswerOpportunityEnabled !== false;
    const elapsedSeconds = (Date.now() - questionStartTimeRef.current) / 1000;

    // Fast Answer Second Chance Shield Defense
    if (!isCorrect && fastOpportunityEnabled && hasSecondChance) {
      setHasSecondChance(false);
      setEliminatedOptions((prev) => [...prev, index]);
      soundService.triggerShield();
      triggerShake();
      setShieldMessage('🛡️ ¡Segunda Oportunidad Activada! Te queda un intento en esta pregunta');
      // Give buffer so they can read and try again without instant timeout
      setTimeLeft((prev) => Math.max(prev, 5));
      return;
    }

    if (questionTimerRef.current) {
      clearInterval(questionTimerRef.current);
      questionTimerRef.current = null;
    }

    setSelectedOptionIndex(index);
    setIsAnswered(true);

    const userAnswer = currentQ.options[index]?.name || '';
    const correctAnswer = currentQ.options[currentQ.correctOptionIndex]?.name || '';

    // Fast Answer Second Chance Shield Reward (on lightning-fast correct answer)
    if (isCorrect && fastOpportunityEnabled && !hasSecondChance && elapsedSeconds <= 2.5) {
      setHasSecondChance(true);
      soundService.triggerShield();
      setShieldMessage('⚡ ¡Respuesta Relámpago! Ganaste 1 Segunda Oportunidad 🛡️');
      setTimeout(() => setShieldMessage(null), 3000);
    }

    // Record for the review breakdown
    setReviewItems((prev) => [
      ...prev,
      {
        id: currentQ.id || `${currentQ.targetCountry.code}-${currentIndex}`,
        flagEmoji: currentQ.targetCountry.flagEmoji,
        countryName: currentQ.targetCountry.name,
        countryCode: currentQ.targetCountry.code,
        userAnswer,
        correctAnswer,
        isCorrect,
        fact: currentQ.targetCountry.fact,
      },
    ]);

    if (!hasCountedGameRef.current) {
      recordGameStart();
      hasCountedGameRef.current = true;
    }
    recordAnswer(isCorrect);

    if (isCorrect) {
      const nextStreak = currentStreak + 1;
      setCurrentStreak(nextStreak);
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
      setCurrentStreak(0);
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

    // Auto-advance: fast (1200ms on correct, 1600ms on error)
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
      setSelectedOptionIndex(null);
      setIsAnswered(false);
      setEliminatedOptions([]);
      setShieldMessage(null);
      questionStartTimeRef.current = Date.now();
      animateQuestionIn();
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    } else {
      finishGame();
    }
  };

  const finishGame = () => {
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

    recordQuizResult(result, continent === 'Mundo' ? undefined : continent, 'flags', hasCountedGameRef.current);
    hasCountedGameRef.current = true;
    setShowSummary(true);

    if (stars >= 2) {
      setShowConfetti(true);
      soundService.triggerCelebration();
    }

    // Sequence star pop animations
    star1Scale.setValue(0);
    star2Scale.setValue(0);
    star3Scale.setValue(0);

    setTimeout(() => {
      if (stars >= 1) {
        Animated.spring(star1Scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
      }
    }, 200);
    setTimeout(() => {
      if (stars >= 2) {
        Animated.spring(star2Scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
      }
    }, 450);
    setTimeout(() => {
      if (stars >= 3) {
        Animated.spring(star3Scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
      }
    }, 700);
  };

  if (questions.length === 0) return null;

  const currentQ = questions[currentIndex];
  const progress = (currentIndex + 1) / questions.length;

  if (showSummary) {
    const stars = calculateStars(score, questions.length);
    const accuracy = Math.round((score / questions.length) * 100);
    const xpEarned = calculateXpEarned(score, questions.length, highestStreak);

    return (
      <View style={[styles.container, { paddingTop: topInset, paddingBottom: Math.max(insets.bottom, 20) }]}>
        <ConfettiView active={showConfetti} onFinish={() => setShowConfetti(false)} />
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryPretitle}>RONDA COMPLETADA</Text>
          <Text style={styles.summaryTitle}>
            {stars === 3 ? '¡Excelente!' : stars === 2 ? '¡Gran Trabajo!' : '¡Sigue Practicando!'}
          </Text>

          {/* Stars */}
          <View style={styles.starsRow}>
            <Animated.View style={{ transform: [{ scale: star1Scale }] }}>
              <Ionicons
                name="star"
                size={54}
                color={stars >= 1 ? IOSColors.goldStar : 'rgba(120, 120, 128, 0.2)'}
              />
            </Animated.View>
            <Animated.View style={[{ transform: [{ scale: star2Scale }] }, styles.centerStar]}>
              <Ionicons
                name="star"
                size={70}
                color={stars >= 2 ? IOSColors.goldStar : 'rgba(120, 120, 128, 0.2)'}
              />
            </Animated.View>
            <Animated.View style={{ transform: [{ scale: star3Scale }] }}>
              <Ionicons
                name="star"
                size={54}
                color={stars >= 3 ? IOSColors.goldStar : 'rgba(120, 120, 128, 0.2)'}
              />
            </Animated.View>
          </View>

          {/* Stat Cards */}
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
              <Text style={styles.statLabel}>Mejor Racha</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.summaryActions}>
            {reviewItems.filter((i) => !i.isCorrect).length > 0 && (
              <AppleButton
                title={`🔁 Repasar Fallos (${reviewItems.filter((i) => !i.isCorrect).length})`}
                onPress={startRetryFailedQuestions}
                variant="gradient"
                style={[styles.actionBtn, { marginBottom: 10 }]}
              />
            )}

            <AppleButton
              title={`Jugar Otra Vez (${questionCount === 'all' ? 'Todas' : `${questionCount} Qs`})`}
              onPress={() => startNewGame()}
              variant={reviewItems.filter((i) => !i.isCorrect).length > 0 ? "secondary" : "gradient"}
              style={styles.actionBtn}
            />

            {/* Quick Question Count Switcher on Game Over */}
            <View style={styles.summaryCountRow}>
              <Text style={styles.summaryCountLabel}>Preguntas para la próxima ronda:</Text>
              <View style={styles.summaryCountChips}>
                {([10, 20, 50, 'all'] as const).map((cnt) => {
                  const isSel = questionCount === cnt;
                  const lbl = cnt === 'all' ? 'Todas' : `${cnt}`;
                  return (
                    <Pressable
                      key={String(cnt)}
                      onPress={() => {
                        soundService.triggerSelection();
                        setQuestionCount(cnt);
                        startNewGame(cnt);
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
              title="Menú Principal"
              onPress={onClose}
              variant="secondary"
              style={styles.actionBtn}
            />
          </View>
        </View>

        <ReviewAnswersModal
          visible={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          items={reviewItems}
          title={isRetryRound ? "Recuento de Repaso" : "Recuento de Quiz"}
          onRetryFailures={reviewItems.filter((i) => !i.isCorrect).length > 0 ? startRetryFailedQuestions : undefined}
        />
      </View>
    );
  }

  const handleCloseQuiz = () => {
    soundService.triggerLightTap();
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
      recordQuizResult(partialResult, continent === 'Mundo' ? undefined : continent, 'flags', true);
    }
    onClose();
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerControlRow}>
          <Pressable onPress={handleCloseQuiz} style={styles.closeBtn} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color={IOSColors.label} />
          </Pressable>

          <View style={[styles.timerPill, timeLeft <= 4 && styles.timerPillUrgent]}>
            <Ionicons
              name="timer"
              size={15}
              color={timeLeft <= 4 ? '#FF3B30' : IOSColors.systemBlue}
            />
            <Text style={[styles.timerText, timeLeft <= 4 && styles.timerTextUrgent]}>
              {timeLeft}s
            </Text>
          </View>

          <View style={styles.headerRight}>
            {hasSecondChance && (
              <View style={styles.shieldPill}>
                <Ionicons name="shield-checkmark" size={13} color="#0284C7" />
                <Text style={styles.shieldPillText}>2ª Oportunidad</Text>
              </View>
            )}
            <View style={styles.scorePill}>
              <Ionicons name="trophy" size={13} color={IOSColors.systemPurple} />
              <Text style={styles.scorePillText}>{score} pts</Text>
            </View>
            <StreakBadge streak={currentStreak} size="small" />
          </View>
        </View>

        <View style={styles.progressContainer}>
          <ProgressBar progress={progress} height={6} />
          <Text style={styles.questionCounter}>
            {currentIndex + 1} de {questions.length}
          </Text>
        </View>

        {isRetryRound && (
          <View style={styles.retryBadgeBar}>
            <Ionicons name="repeat" size={12} color="#D97706" />
            <Text style={styles.retryBadgeBarText}>MODO REPASO DE FALLOS</Text>
          </View>
        )}

        {shieldMessage && (
          <View style={[styles.shieldBanner, shieldMessage.includes('Relámpago') ? styles.shieldBannerReward : styles.shieldBannerDefend]}>
            <Ionicons
              name={shieldMessage.includes('Relámpago') ? 'flash' : 'shield-checkmark'}
              size={15}
              color={shieldMessage.includes('Relámpago') ? '#D97706' : '#0284C7'}
            />
            <Text
              style={[
                styles.shieldBannerText,
                { color: shieldMessage.includes('Relámpago') ? '#92400E' : '#0369A1' },
              ]}
            >
              {shieldMessage}
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Animated Question Card */}
        <Animated.View
          style={[
            styles.questionCard,
            {
              opacity: cardOpacity,
              transform: [{ scale: cardScale }, { translateX: shakeAnim }],
            },
          ]}
        >
          <Text style={styles.promptText}>¿A qué país pertenece esta bandera?</Text>

          <View style={styles.flagWrap}>
            <FlagImage
              countryCode={currentQ.targetCountry.code}
              fallbackEmoji={currentQ.targetCountry.flagEmoji}
              width={220}
              height={140}
              borderRadius={18}
            />
          </View>

          <View style={styles.continentPill}>
            <Ionicons name="location-sharp" size={13} color={IOSColors.systemBlue} />
            <Text style={styles.continentPillText}>{currentQ.targetCountry.continent}</Text>
          </View>
        </Animated.View>

        {/* Timeout Loss Warning Banner */}
        {isAnswered && selectedOptionIndex === null && (
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

        {/* Options List */}
        <View style={styles.optionsContainer}>
          {currentQ.options.map((option, idx) => {
            const isSelected = selectedOptionIndex === idx;
            const isCorrectOption = idx === currentQ.correctOptionIndex;
            const isTimeout = isAnswered && selectedOptionIndex === null;
            const isEliminated = eliminatedOptions.includes(idx);

            let cardStyle: any = styles.optionNormal;
            let iconName: keyof typeof Ionicons.glyphMap | null = null;
            let iconColor = IOSColors.secondaryLabel;

            if (isEliminated) {
              cardStyle = styles.optionEliminated;
              iconName = 'close-circle';
              iconColor = IOSColors.systemRed;
            } else if (isAnswered) {
              if (isTimeout) {
                if (isCorrectOption) {
                  cardStyle = styles.optionTimeoutReveal;
                } else {
                  cardStyle = styles.optionDimmed;
                }
              } else if (isCorrectOption) {
                cardStyle = styles.optionCorrect;
                iconName = 'checkmark-circle';
                iconColor = IOSColors.systemGreen;
              } else if (isSelected) {
                cardStyle = styles.optionWrong;
                iconName = 'close-circle';
                iconColor = IOSColors.systemRed;
              }
            }

            return (
              <Pressable
                key={option.code}
                onPress={() => handleSelectOption(idx)}
                disabled={isAnswered || isEliminated}
                style={[styles.optionCard, cardStyle]}
              >
                <Text
                  style={[
                    styles.optionText,
                    isEliminated && styles.optionTextEliminated,
                    isAnswered && !isTimeout && isCorrectOption && styles.optionTextCorrect,
                    isAnswered && isSelected && !isCorrectOption && styles.optionTextWrong,
                    isTimeout && isCorrectOption && styles.optionTextTimeoutReveal,
                    isTimeout && !isCorrectOption && styles.optionTextDimmed,
                  ]}
                >
                  {option.name}
                </Text>
                {isEliminated ? (
                  <View style={styles.eliminatedBadge}>
                    <Ionicons name="shield" size={11} color={IOSColors.systemRed} />
                    <Text style={styles.eliminatedBadgeText}>Descartada</Text>
                  </View>
                ) : isTimeout && isCorrectOption ? (
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
          <View style={styles.factContainer}>
            <View style={styles.factHeader}>
              <Ionicons name="information-circle" size={18} color={IOSColors.systemBlue} />
              <Text style={styles.factTitle}>¿Sabías que...?</Text>
            </View>
            <Text style={styles.factText}>{currentQ.targetCountry.fact}</Text>
            <Text style={styles.factCapital}>
              Capital: <Text style={{ fontWeight: '700' }}>{currentQ.targetCountry.capital}</Text> • Población: {currentQ.targetCountry.population}
            </Text>
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
                        selectedOptionIndex === null
                          ? 'rgba(255, 59, 48, 0.14)'
                          : selectedOptionIndex === currentQ.correctOptionIndex
                          ? 'rgba(52, 199, 89, 0.12)'
                          : 'rgba(255, 149, 0, 0.12)',
                    },
                  ]}
                >
                  <Ionicons
                    name={selectedOptionIndex === null ? 'timer-outline' : 'flash'}
                    size={14}
                    color={
                      selectedOptionIndex === null
                        ? IOSColors.systemRed
                        : selectedOptionIndex === currentQ.correctOptionIndex
                        ? IOSColors.systemGreen
                        : IOSColors.systemOrange
                    }
                  />
                </View>
                <View style={styles.autoAdvanceTextWrap}>
                  <Text
                    style={[
                      styles.autoAdvanceTitle,
                      selectedOptionIndex === null && { color: IOSColors.systemRed },
                    ]}
                    numberOfLines={1}
                  >
                    {selectedOptionIndex === null
                      ? 'Tiempo Agotado'
                      : currentIndex + 1 < questions.length
                      ? 'Siguiente Pregunta'
                      : 'Ver Resultados'}
                  </Text>
                  <Text style={styles.autoAdvanceSubtitle} numberOfLines={1}>
                    {selectedOptionIndex === null ? 'Pasando a la siguiente...' : 'Avanzando automáticamente'}
                  </Text>
                </View>
              </View>

              <View style={styles.skipBtnPill}>
                <Text style={styles.skipBtnText}>Saltar</Text>
                <Ionicons name="arrow-forward" size={12} color={IOSColors.systemBlue} style={{ marginLeft: 3 }} />
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
                      selectedOptionIndex === currentQ.correctOptionIndex
                        ? IOSColors.systemGreen
                        : IOSColors.systemBlue,
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
  closeBtn: {
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
    ...IOSColors.cardShadow,
  },
  promptText: {
    fontSize: 17,
    fontWeight: '600',
    color: IOSColors.secondaryLabel,
    marginBottom: 16,
    textAlign: 'center',
  },
  flagWrap: {
    marginBottom: 14,
  },
  continentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  continentPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: IOSColors.systemBlue,
    marginLeft: 4,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
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
  optionNormal: {
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  optionCorrect: {
    backgroundColor: IOSColors.correctCardBackground,
    borderColor: IOSColors.systemGreen,
    elevation: 2,
  },
  optionWrong: {
    backgroundColor: IOSColors.wrongCardBackground,
    borderColor: IOSColors.systemRed,
    elevation: 2,
  },
  optionTimeoutReveal: {
    backgroundColor: 'rgba(255, 149, 0, 0.08)',
    borderColor: '#FF9500',
    borderWidth: 1.5,
  },
  optionDimmed: {
    opacity: 0.45,
  },
  optionText: {
    fontSize: 17,
    fontWeight: '600',
    color: IOSColors.label,
    flex: 1,
    marginRight: 8,
  },
  optionTextCorrect: {
    color: IOSColors.systemGreen,
  },
  optionTextWrong: {
    color: IOSColors.systemRed,
  },
  optionTextTimeoutReveal: {
    color: '#D97706',
    fontWeight: '700',
  },
  optionTextDimmed: {
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
  factContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.15)',
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
    color: IOSColors.systemBlue,
    marginLeft: 6,
  },
  factText: {
    fontSize: 14,
    color: IOSColors.label,
    lineHeight: 20,
    marginBottom: 8,
  },
  factCapital: {
    fontSize: 12,
    color: IOSColors.secondaryLabel,
  },
  nextActionWrap: {
    marginTop: 18,
    width: '100%',
  },
  // Summary Screen Styles
  summaryContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  summaryPretitle: {
    fontSize: 13,
    fontWeight: '700',
    color: IOSColors.systemBlue,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  summaryTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: IOSColors.label,
    marginBottom: 20,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
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
  summaryActions: {
    width: '100%',
    gap: 12,
  },
  actionBtn: {
    width: '100%',
  },
  // Auto advance prompt styles
  autoAdvanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.18)',
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
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    flexShrink: 0,
  },
  skipBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: IOSColors.systemBlue,
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
  summaryCountRow: {
    width: '100%',
    marginVertical: 12,
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
    backgroundColor: IOSColors.systemBlue,
    borderColor: IOSColors.systemBlue,
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
  optionEliminated: {
    backgroundColor: 'rgba(255, 59, 48, 0.06)',
    borderColor: 'rgba(255, 59, 48, 0.25)',
    opacity: 0.65,
  },
  optionTextEliminated: {
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
