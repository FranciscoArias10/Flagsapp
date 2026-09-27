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
import { useGame } from '../context/GameContext';

interface CapitalQuestion {
  country: Country;
  options: string[]; // 4 capital choices
  correctCapital: string;
}

export const CapitalsGameScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) : 0);
  const { recordAnswer, recordQuizResult } = useGame();

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

  const scrollViewRef = useRef<ScrollView>(null);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownAnim = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.92)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, []);

  useEffect(() => {
    startNewRound();
  }, []);

  const generateCapitalQuestions = (count = 10): CapitalQuestion[] => {
    const shuffled = [...COUNTRIES].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);

    return selected.map((country) => {
      // Pick 3 distractors from other capitals
      const otherCapitals = COUNTRIES
        .filter((c) => c.capital !== country.capital)
        .map((c) => c.capital)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);

      const options = [country.capital, ...otherCapitals].sort(() => 0.5 - Math.random());

      return {
        country,
        options,
        correctCapital: country.capital,
      };
    });
  };

  const startNewRound = () => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    countdownAnim.stopAnimation();
    countdownAnim.setValue(0);
    const qs = generateCapitalQuestions(10);
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

  const handleSelectCapital = (cap: string) => {
    if (isAnswered) return;

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
    countdownAnim.stopAnimation();
    countdownAnim.setValue(0);

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

    recordQuizResult(result, undefined, 'capitals');
    setShowSummary(true);

    if (stars >= 2) {
      setShowConfetti(true);
      soundService.triggerCelebration();
    }
  };

  if (questions.length === 0) return null;

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

          {/* Review Details Row Card */}
          <Pressable
            onPress={() => {
              soundService.triggerLightTap();
              setShowReviewModal(true);
            }}
            style={({ pressed }) => [
              styles.reviewRowCard,
              pressed && { opacity: 0.8 },
            ]}
          >
            <View style={styles.reviewRowLeft}>
              <View style={styles.reviewIconCircle}>
                <Ionicons name="clipboard-outline" size={20} color={IOSColors.systemPurple} />
              </View>
              <View style={styles.reviewRowMeta}>
                <Text style={styles.reviewRowTitle}>Recuento de Capitales</Text>
                <Text style={styles.reviewRowSubtitle}>
                  Toca para revisar tus {score} aciertos y {questions.length - score} fallos
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={IOSColors.tertiaryLabel} />
          </Pressable>

          <AppleButton
            title="Nueva Ronda de Capitales"
            onPress={startNewRound}
            variant="gradient"
            style={{ width: '100%' }}
          />
        </View>

        <ReviewAnswersModal
          visible={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          items={reviewItems}
          title="Recuento de Capitales"
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.topHeader}>
        <View style={styles.progressContainer}>
          <ProgressBar
            progress={progress}
            height={8}
            gradientColors={['#AF52DE', '#5856D6']}
          />
          <Text style={styles.questionCounter}>
            {currentIndex + 1} de {questions.length}
          </Text>
        </View>
        <StreakBadge streak={streak} size="small" />
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
          <Text style={styles.questionSubtitle}>¿Cuál es la capital de...?</Text>
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

        {/* Capital Choices */}
        <View style={styles.choicesList}>
          {currentQ.options.map((cap) => {
            const isSelected = selectedCapital === cap;
            const isCorrect = cap === currentQ.correctCapital;

            let cardStyle = styles.choiceNormal;
            let iconName: keyof typeof Ionicons.glyphMap | null = null;
            let iconColor = IOSColors.secondaryLabel;

            if (isAnswered) {
              if (isCorrect) {
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
                      isAnswered && isCorrect
                        ? IOSColors.systemGreen
                        : isAnswered && isSelected
                        ? IOSColors.systemRed
                        : IOSColors.systemPurple
                    }
                    style={{ marginRight: 12 }}
                  />
                  <Text
                    style={[
                      styles.choiceText,
                      isAnswered && isCorrect && styles.textCorrect,
                      isAnswered && isSelected && !isCorrect && styles.textWrong,
                    ]}
                  >
                    {cap}
                  </Text>
                </View>
                {iconName && <Ionicons name={iconName} size={22} color={iconColor} />}
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
                        selectedCapital === currentQ.correctCapital
                          ? 'rgba(52, 199, 89, 0.12)'
                          : 'rgba(255, 149, 0, 0.12)',
                    },
                  ]}
                >
                  <Ionicons
                    name="flash"
                    size={14}
                    color={
                      selectedCapital === currentQ.correctCapital
                        ? IOSColors.systemGreen
                        : IOSColors.systemOrange
                    }
                  />
                </View>
                <View style={styles.autoAdvanceTextWrap}>
                  <Text style={styles.autoAdvanceTitle} numberOfLines={1}>
                    {currentIndex + 1 < questions.length ? 'Siguiente Capital' : 'Ver Puntuación'}
                  </Text>
                  <Text style={styles.autoAdvanceSubtitle} numberOfLines={1}>
                    Avanzando automáticamente
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  progressContainer: {
    flex: 1,
    marginRight: 16,
    alignItems: 'center',
  },
  questionCounter: {
    fontSize: 12,
    fontWeight: '600',
    color: IOSColors.tertiaryLabel,
    marginTop: 6,
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
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  // Review Row Card in Summary
  reviewRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    width: '100%',
    padding: 14,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(175, 82, 222, 0.2)',
    ...IOSColors.cardShadow,
  },
  reviewRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  reviewIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(175, 82, 222, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reviewRowMeta: {
    flex: 1,
  },
  reviewRowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: IOSColors.label,
  },
  reviewRowSubtitle: {
    fontSize: 12,
    color: IOSColors.secondaryLabel,
    marginTop: 2,
  },
});
