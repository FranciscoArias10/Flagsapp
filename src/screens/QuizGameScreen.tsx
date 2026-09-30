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
import { generateQuizQuestions, calculateStars, calculateXpEarned } from '../utils/quizGenerator';
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
  onClose: () => void;
}

export const QuizGameScreen: React.FC<QuizGameScreenProps> = ({
  continent = 'Mundo',
  initialQuestionCount = 10,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) : 0);
  const { recordAnswer, recordQuizResult } = useGame();

  const [questionCount, setQuestionCount] = useState<number | 'all'>(initialQuestionCount);
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

  const QUESTION_TIME_LIMIT = 15;
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);
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
    startNewGame();
  }, [continent]);

  // Question countdown timer effect
  useEffect(() => {
    if (questions.length === 0 || showSummary || isAnswered) {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
      return;
    }

    setTimeLeft(QUESTION_TIME_LIMIT);
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);

    questionTimerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (questionTimerRef.current) clearInterval(questionTimerRef.current);
          handleTimeout();
          return 0;
        }
        if (prev <= 4) {
          soundService.triggerLightTap();
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, [currentIndex, questions.length, showSummary, isAnswered]);

  const startNewGame = (countParam = questionCount) => {
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
    setTimeLeft(QUESTION_TIME_LIMIT);
    const targetCount = countParam === 'all' ? 999 : countParam;
    const generated = generateQuizQuestions(targetCount, continent, 'flag_to_name');
    setQuestions(generated);
    setCurrentIndex(0);
    setSelectedOptionIndex(null);
    setIsAnswered(false);
    setScore(0);
    setCurrentStreak(0);
    setHighestStreak(0);
    setReviewItems([]);
    setShowSummary(false);
    setShowConfetti(false);
    setShowReviewModal(false);
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
    if (isAnswered) return;
    if (questionTimerRef.current) {
      clearInterval(questionTimerRef.current);
      questionTimerRef.current = null;
    }

    setSelectedOptionIndex(index);
    setIsAnswered(true);

    const currentQ = questions[currentIndex];
    const isCorrect = index === currentQ.correctOptionIndex;
    const userAnswer = currentQ.options[index]?.name || '';
    const correctAnswer = currentQ.options[currentQ.correctOptionIndex]?.name || '';

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

    recordAnswer(isCorrect);

    if (isCorrect) {
      soundService.triggerSuccess();
      const nextStreak = currentStreak + 1;
      setCurrentStreak(nextStreak);
      setHighestStreak((prev) => Math.max(prev, nextStreak));
      setScore((prev) => prev + 1);
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
    setTimeLeft(QUESTION_TIME_LIMIT);

    soundService.triggerLightTap();

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOptionIndex(null);
      setIsAnswered(false);
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

    recordQuizResult(result, continent === 'Mundo' ? undefined : continent, 'flags');
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
            <AppleButton
              title={`Jugar Otra Vez (${questionCount === 'all' ? 'Todas' : `${questionCount} Qs`})`}
              onPress={() => startNewGame()}
              variant="gradient"
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
          title="Recuento de Quiz"
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerControlRow}>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
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
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 + insets.bottom }]}
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

        {/* Options List */}
        <View style={styles.optionsContainer}>
          {currentQ.options.map((option, idx) => {
            const isSelected = selectedOptionIndex === idx;
            const isCorrectOption = idx === currentQ.correctOptionIndex;

            let cardStyle = styles.optionNormal;
            let iconName: keyof typeof Ionicons.glyphMap | null = null;
            let iconColor = IOSColors.secondaryLabel;

            if (isAnswered) {
              if (isCorrectOption) {
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
                disabled={isAnswered}
                style={[styles.optionCard, cardStyle]}
              >
                <Text
                  style={[
                    styles.optionText,
                    isAnswered && isCorrectOption && styles.optionTextCorrect,
                    isAnswered && isSelected && !isCorrectOption && styles.optionTextWrong,
                  ]}
                >
                  {option.name}
                </Text>
                {iconName && (
                  <Ionicons name={iconName} size={22} color={iconColor} />
                )}
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
                        selectedOptionIndex === currentQ.correctOptionIndex
                          ? 'rgba(52, 199, 89, 0.12)'
                          : 'rgba(255, 149, 0, 0.12)',
                    },
                  ]}
                >
                  <Ionicons
                    name="flash"
                    size={14}
                    color={
                      selectedOptionIndex === currentQ.correctOptionIndex
                        ? IOSColors.systemGreen
                        : IOSColors.systemOrange
                    }
                  />
                </View>
                <View style={styles.autoAdvanceTextWrap}>
                  <Text style={styles.autoAdvanceTitle} numberOfLines={1}>
                    {currentIndex + 1 < questions.length ? 'Siguiente Pregunta' : 'Ver Resultados'}
                  </Text>
                  <Text style={styles.autoAdvanceSubtitle} numberOfLines={1}>
                    Avanzando automáticamente
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
});
