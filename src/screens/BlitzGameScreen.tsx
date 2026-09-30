import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  StatusBar as RNStatusBar,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Country, QuizResult, AnswerReviewItem, BlitzDifficulty } from '../types';
import { COUNTRIES } from '../data/countries';
import { calculateXpEarned } from '../utils/quizGenerator';
import { IOSColors } from '../utils/colors';
import { soundService } from '../utils/soundHelper';
import { FlagImage } from '../components/FlagImage';
import { AppleButton } from '../components/AppleButton';
import { StreakBadge } from '../components/StreakBadge';
import { ConfettiView } from '../components/ConfettiView';
import { ReviewAnswersModal } from '../components/ReviewAnswersModal';
import { useGame } from '../context/GameContext';

interface BlitzQuestion {
  target: Country;
  options: Country[];
  correctIndex: number;
}

export interface BlitzDifficultyConfig {
  key: BlitzDifficulty;
  title: string;
  badge: string;
  seconds: number;
  bonus: number;
  penalty: number;
  subtitle: string;
  description: string;
  color: string;
  gradient: [string, string];
  icon: keyof typeof Ionicons.glyphMap;
  tag: string;
  tagBg: string;
  tagColor: string;
}

export const BLITZ_DIFFICULTIES: Record<BlitzDifficulty, BlitzDifficultyConfig> = {
  easy: {
    key: 'easy',
    title: 'Rápido',
    badge: '15 Segundos',
    seconds: 15,
    bonus: 2,
    penalty: 2,
    subtitle: 'Calentamiento ágil',
    description: '15s iniciales • +2s acierto • -2s fallo',
    color: '#34C759',
    gradient: ['#34C759', '#30D158'],
    icon: 'speedometer-outline',
    tag: 'AGILIDAD',
    tagBg: 'rgba(52, 199, 89, 0.12)',
    tagColor: '#34C759',
  },
  medium: {
    key: 'medium',
    title: 'Frenético',
    badge: '10 Segundos',
    seconds: 10,
    bonus: 2,
    penalty: 2,
    subtitle: 'Ritmo voraz y electrizante',
    description: '10s iniciales • +2s acierto • -2s fallo',
    color: '#FF9500',
    gradient: ['#FF9500', '#FF3B30'],
    icon: 'flame',
    tag: 'RECOMENDADO',
    tagBg: 'rgba(255, 149, 0, 0.12)',
    tagColor: '#FF9500',
  },
  hard: {
    key: 'hard',
    title: 'Extremo',
    badge: '5 Segundos',
    seconds: 5,
    bonus: 1,
    penalty: 2,
    subtitle: '¡Solo 5 segundos! Reflejos sobrehumanos',
    description: '5s iniciales • +1s acierto • -2s fallo',
    color: '#FF3B30',
    gradient: ['#FF3B30', '#AF52DE'],
    icon: 'skull-outline',
    tag: 'HARDCORE 💀',
    tagBg: 'rgba(255, 59, 48, 0.12)',
    tagColor: '#FF3B30',
  },
};

type ScreenMode = 'difficulty_select' | 'playing' | 'game_over';

export const BlitzGameScreen: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) : 0);
  const { recordAnswer, recordQuizResult } = useGame();

  const [screenMode, setScreenMode] = useState<ScreenMode>('difficulty_select');
  const [selectedDifficulty, setSelectedDifficulty] = useState<BlitzDifficulty>('medium');
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<number | 'all'>(10);
  const [timeLeft, setTimeLeft] = useState(10);
  const [currentQ, setCurrentQ] = useState<BlitzQuestion | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [highestStreak, setHighestStreak] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [reviewItems, setReviewItems] = useState<AnswerReviewItem[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Animations
  const timerScale = useRef(new Animated.Value(1)).current;
  const cardScale = useRef(new Animated.Value(0.95)).current;
  const bonusAnim = useRef(new Animated.Value(0)).current;
  const [bonusText, setBonusText] = useState<string | null>(null);

  // Timer interval
  useEffect(() => {
    if (screenMode !== 'playing') return;

    if (timeLeft <= 0) {
      handleGameOver();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleGameOver();
          return 0;
        }
        const urgentThreshold = selectedDifficulty === 'hard' ? 3 : 5;
        if (prev <= urgentThreshold) {
          // Heartbeat pulse when time is running low
          Animated.sequence([
            Animated.timing(timerScale, { toValue: 1.15, duration: 100, useNativeDriver: true }),
            Animated.timing(timerScale, { toValue: 1, duration: 100, useNativeDriver: true }),
          ]).start();
          soundService.triggerLightTap();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [screenMode, timeLeft, selectedDifficulty]);

  const generateNextQuestion = () => {
    const randomTarget = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
    const distractors = COUNTRIES
      .filter((c) => c.code !== randomTarget.code)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    const options = [randomTarget, ...distractors].sort(() => 0.5 - Math.random());
    const correctIndex = options.findIndex((c) => c.code === randomTarget.code);

    setCurrentQ({ target: randomTarget, options, correctIndex });
    setSelectedIdx(null);
    setIsAnswered(false);

    cardScale.setValue(0.94);
    Animated.spring(cardScale, { toValue: 1, friction: 6, useNativeDriver: true }).start();
  };

  const showBonusPopup = (text: string) => {
    setBonusText(text);
    bonusAnim.setValue(0);
    Animated.sequence([
      Animated.timing(bonusAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(400),
      Animated.timing(bonusAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const startBlitzWithDifficulty = (diff: BlitzDifficulty) => {
    soundService.triggerSelection();
    setSelectedDifficulty(diff);
    setTimeLeft(BLITZ_DIFFICULTIES[diff].seconds);
    setScore(0);
    setStreak(0);
    setHighestStreak(0);
    setReviewItems([]);
    setShowConfetti(false);
    setShowReviewModal(false);
    setBonusText(null);
    setSelectedIdx(null);
    setIsAnswered(false);
    setScreenMode('playing');
    generateNextQuestion();
  };

  const restartBlitz = () => {
    startBlitzWithDifficulty(selectedDifficulty);
  };

  const handleChangeDifficulty = () => {
    soundService.triggerLightTap();
    setScreenMode('difficulty_select');
  };

  const handleSelectOption = (idx: number) => {
    if (isAnswered || !currentQ || screenMode !== 'playing') return;

    setSelectedIdx(idx);
    setIsAnswered(true);

    const isCorrect = idx === currentQ.correctIndex;
    const userAnswer = currentQ.options[idx]?.name || '';
    const correctAnswer = currentQ.options[currentQ.correctIndex]?.name || '';
    const diffConfig = BLITZ_DIFFICULTIES[selectedDifficulty];

    // Record review item
    setReviewItems((prev) => [
      ...prev,
      {
        id: `${currentQ.target.code}-${Date.now()}-${prev.length}`,
        flagEmoji: currentQ.target.flagEmoji,
        countryName: currentQ.target.name,
        countryCode: currentQ.target.code,
        userAnswer,
        correctAnswer,
        isCorrect,
        fact: currentQ.target.fact,
      },
    ]);

    recordAnswer(isCorrect);

    if (isCorrect) {
      soundService.triggerSuccess();
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setHighestStreak((prev) => Math.max(prev, nextStreak));
      setScore((prev) => prev + 1);
      setTimeLeft((prev) => prev + diffConfig.bonus);
      showBonusPopup(`+${diffConfig.bonus}s`);
    } else {
      soundService.triggerError();
      setStreak(0);
      setTimeLeft((prev) => Math.max(0, prev - diffConfig.penalty));
      showBonusPopup(`-${diffConfig.penalty}s`);
    }

    const newCount = reviewItems.length + 1;
    const targetCount = selectedQuestionCount === 'all' ? Infinity : selectedQuestionCount;

    if (newCount >= targetCount) {
      setTimeout(() => {
        handleGameOver();
      }, isCorrect ? 260 : 380);
      return;
    }

    if (isCorrect) {
      // Fast frantic transition (260ms)
      setTimeout(() => {
        generateNextQuestion();
      }, 260);
    } else {
      // Quick recovery transition (380ms)
      setTimeout(() => {
        generateNextQuestion();
      }, 380);
    }
  };

  const handleGameOver = () => {
    setScreenMode('game_over');
    const finalScore = score;
    const total = score + (streak === 0 && score > 0 ? 3 : 1);
    const xpEarned = calculateXpEarned(finalScore, total, highestStreak, finalScore * 10);

    const result: QuizResult = {
      score: finalScore,
      totalQuestions: total,
      xpEarned,
      accuracy: Math.round((finalScore / Math.max(1, total)) * 100),
      highestStreak,
      stars: finalScore >= 12 ? 3 : finalScore >= 7 ? 2 : 1,
    };

    recordQuizResult(result, undefined, 'blitz');

    const confettiThreshold = selectedDifficulty === 'hard' ? 5 : 10;
    if (finalScore >= confettiThreshold) {
      setShowConfetti(true);
      soundService.triggerCelebration();
    } else {
      soundService.triggerMediumTap();
    }
  };

  // 1. DIFFICULTY SELECTION SCREEN
  if (screenMode === 'difficulty_select') {
    return (
      <View style={[styles.container, { paddingTop: topInset, paddingBottom: Math.max(insets.bottom, 20) }]}>
        {/* Header with Close */}
        <View style={styles.diffHeaderBar}>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
            <Ionicons name="close-circle" size={32} color={IOSColors.tertiaryLabel} />
          </Pressable>
          <View style={styles.diffHeaderTitleWrap}>
            <Text style={styles.diffPretitle}>MODO CONTRARRELOJ</Text>
            <Text style={styles.diffTitle} numberOfLines={1} adjustsFontSizeToFit>
              Desafío Blitz
            </Text>
          </View>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          style={styles.diffScroll}
          contentContainerStyle={styles.diffScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.diffSubtitle}>
            Selecciona tu nivel de adrenalina. Cada acierto suma segundos al reloj, pero cada error te restará tiempo:
          </Text>

          {/* Question Count Selection Strip */}
          <View style={styles.blitzCountBox}>
            <View style={styles.blitzCountHeader}>
              <Text style={styles.blitzCountTitle}>PREGUNTAS POR PARTIDA</Text>
              <Text style={styles.blitzCountSub}>
                {selectedQuestionCount === 'all' ? 'Todo el Catálogo' : `${selectedQuestionCount} Preguntas`}
              </Text>
            </View>
            <View style={styles.blitzCountChips}>
              {([10, 20, 50, 'all'] as const).map((cnt) => {
                const isSel = selectedQuestionCount === cnt;
                const lbl = cnt === 'all' ? 'Todas' : `${cnt}`;
                return (
                  <Pressable
                    key={String(cnt)}
                    onPress={() => {
                      soundService.triggerSelection();
                      setSelectedQuestionCount(cnt);
                    }}
                    style={[
                      styles.blitzCountChip,
                      isSel && styles.blitzCountChipActive,
                    ]}
                  >
                    <Text style={[styles.blitzCountChipText, isSel && styles.blitzCountChipTextActive]}>
                      {lbl}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Cards for each difficulty */}
          {(Object.keys(BLITZ_DIFFICULTIES) as BlitzDifficulty[]).map((key) => {
            const diff = BLITZ_DIFFICULTIES[key];
            const isFeatured = key === 'medium';
            const isHard = key === 'hard';

            return (
              <Pressable
                key={diff.key}
                onPress={() => startBlitzWithDifficulty(diff.key)}
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
                    <View style={[styles.diffTagBadge, { backgroundColor: diff.tagBg }]}>
                      <Text style={[styles.diffTagBadgeText, { color: diff.tagColor }]}>
                        {diff.tag}
                      </Text>
                    </View>
                    <Text style={styles.diffCardTitle} numberOfLines={1} adjustsFontSizeToFit>
                      {diff.title}
                    </Text>
                    <Text style={styles.diffCardSubtitle} numberOfLines={1}>
                      {diff.subtitle}
                    </Text>
                  </View>
                </View>

                {/* Rules Pills Row */}
                <View style={styles.diffPillsRow}>
                  <View style={styles.diffRulePill}>
                    <Ionicons name="timer-outline" size={14} color={diff.color} />
                    <Text style={[styles.diffRulePillText, { color: diff.color }]}>
                      {diff.seconds}s iniciales
                    </Text>
                  </View>
                  <View style={[styles.diffRulePill, { backgroundColor: 'rgba(52, 199, 89, 0.1)' }]}>
                    <Ionicons name="add-circle-outline" size={14} color={IOSColors.systemGreen} />
                    <Text style={[styles.diffRulePillText, { color: IOSColors.systemGreen }]}>
                      +{diff.bonus}s acierto
                    </Text>
                  </View>
                  <View style={[styles.diffRulePill, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}>
                    <Ionicons name="remove-circle-outline" size={14} color={IOSColors.systemRed} />
                    <Text style={[styles.diffRulePillText, { color: IOSColors.systemRed }]}>
                      -{diff.penalty}s fallo
                    </Text>
                  </View>
                </View>

                {/* Bottom CTA bar */}
                <View style={styles.diffCardBottomBar}>
                  <Text style={styles.diffCardPlayText}>Toca para comenzar</Text>
                  <View style={[styles.diffArrowCircle, { backgroundColor: diff.color }]}>
                    <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
                  </View>
                </View>
              </Pressable>
            );
          })}

          <View style={styles.diffTipBox}>
            <Ionicons name="information-circle-outline" size={18} color={IOSColors.secondaryLabel} />
            <Text style={styles.diffTipText}>
              En el modo Extremo tienes solo 5 segundos iniciales. ¡Necesitarás reflejos inmediatos de menos de un segundo para sobrevivir!
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // 2. GAME OVER / RESULTS SCREEN
  if (screenMode === 'game_over') {
    const currentDiffConfig = BLITZ_DIFFICULTIES[selectedDifficulty];
    const rankTitle =
      score >= 16
        ? '⚡ Dios del Rayo'
        : score >= 10
        ? '🚀 Supersónico'
        : score >= 6
        ? '🏎️ Veloz'
        : score >= 3
        ? '🧭 Explorador Ágil'
        : '⏱️ Buen Intento';

    return (
      <View style={[styles.container, { paddingTop: topInset, paddingBottom: Math.max(insets.bottom, 20) }]}>
        <ConfettiView active={showConfetti} onFinish={() => setShowConfetti(false)} />
        <View style={styles.gameOverWrap}>
          <Text style={styles.blitzPretitle}>¡TIEMPO AGOTADO!</Text>
          <Text style={styles.blitzRank}>{rankTitle}</Text>

          {/* Difficulty Badge */}
          <View
            style={[
              styles.diffBadgeGameOver,
              { backgroundColor: currentDiffConfig.tagBg, borderColor: currentDiffConfig.color },
            ]}
          >
            <Ionicons name={currentDiffConfig.icon} size={15} color={currentDiffConfig.color} />
            <Text style={[styles.diffBadgeGameOverText, { color: currentDiffConfig.color }]}>
              DIFICULTAD: {currentDiffConfig.title.toUpperCase()} ({currentDiffConfig.seconds}S)
            </Text>
          </View>

          <Pressable
            onPress={() => {
              if (reviewItems.length > 0) {
                soundService.triggerLightTap();
                setShowReviewModal(true);
              }
            }}
            style={({ pressed }) => [
              styles.scoreCircle,
              pressed && { transform: [{ scale: 0.95 }] },
            ]}
          >
            <View style={styles.reviewBadgeHintBlitz}>
              <Ionicons name="eye" size={11} color="#FFFFFF" />
              <Text style={styles.reviewBadgeHintText}>VER</Text>
            </View>
            <Text style={styles.bigScore}>{score}</Text>
            <Text style={styles.bigScoreLabel}>Aciertos 👆</Text>
          </Pressable>

          <View style={styles.statCardsGrid}>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: IOSColors.systemOrange }]}>{highestStreak} 🔥</Text>
              <Text style={styles.statLabel}>Mejor Racha</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: IOSColors.systemPurple }]}>+{score * 35}</Text>
              <Text style={styles.statLabel}>XP Total</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <AppleButton
              title={`Jugar Otra Vez (${currentDiffConfig.title} ${currentDiffConfig.seconds}s)`}
              onPress={restartBlitz}
              variant="gradient"
              style={{ width: '100%' }}
            />
            <AppleButton
              title="Cambiar Dificultad"
              onPress={handleChangeDifficulty}
              variant="secondary"
              style={{ width: '100%', marginTop: 10 }}
            />
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.exitLinkBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.exitLinkBtnText}>Volver al Menú</Text>
            </Pressable>
          </View>
        </View>

        <ReviewAnswersModal
          visible={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          items={reviewItems}
          title={`Recuento Blitz (${currentDiffConfig.title} ${currentDiffConfig.seconds}s)`}
        />
      </View>
    );
  }

  // 3. PLAYING SCREEN
  if (!currentQ) return null;

  const urgentThreshold = selectedDifficulty === 'hard' ? 2 : 4;
  const isLowTime = timeLeft <= urgentThreshold;

  return (
    <View style={[styles.container, { paddingTop: topInset, paddingBottom: Math.max(insets.bottom, 20) }]}>
      {/* Top Blitz Header */}
      <View style={styles.blitzTopHeader}>
        <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
          <Ionicons name="close-circle" size={30} color={IOSColors.tertiaryLabel} />
        </Pressable>

        {/* Central Timer */}
        <Animated.View
          style={[
            styles.timerPill,
            isLowTime && styles.timerPillUrgent,
            { transform: [{ scale: timerScale }] },
          ]}
        >
          <Ionicons
            name="timer"
            size={18}
            color={isLowTime ? '#FF3B30' : IOSColors.systemBlue}
          />
          <Text style={[styles.timerText, isLowTime && styles.timerTextUrgent]}>
            {timeLeft}s
          </Text>
        </Animated.View>

        {/* Streak & Score */}
        <View style={styles.headerRight}>
          <StreakBadge streak={streak} size="small" />
          <View style={styles.scorePill}>
            <Text style={styles.scorePillText}>
              pts: {score}{selectedQuestionCount !== 'all' ? ` (${Math.min(reviewItems.length + 1, selectedQuestionCount)}/${selectedQuestionCount})` : ''}
            </Text>
          </View>
        </View>
      </View>

      {/* Bonus / Penalty Popup */}
      {bonusText && (
        <Animated.View
          style={[
            styles.bonusBadge,
            bonusText.startsWith('+') ? styles.bonusPositive : styles.bonusNegative,
            {
              opacity: bonusAnim,
              transform: [
                {
                  translateY: bonusAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, -5],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.bonusBadgeText}>{bonusText}</Text>
        </Animated.View>
      )}

      {/* Flag Card */}
      <Animated.View style={[styles.flagCard, { transform: [{ scale: cardScale }] }]}>
        <Text style={styles.prompt}>Identifica rápido:</Text>
        <FlagImage
          countryCode={currentQ.target.code}
          fallbackEmoji={currentQ.target.flagEmoji}
          width={240}
          height={150}
          borderRadius={20}
        />
        <Text style={styles.continentHint}>{currentQ.target.continent}</Text>
      </Animated.View>

      {/* 4 Quick Options */}
      <View style={styles.optionsWrap}>
        {currentQ.options.map((option, idx) => {
          const isSelected = selectedIdx === idx;
          const isCorrect = idx === currentQ.correctIndex;

          let optionStyle = styles.optBase;
          if (isAnswered) {
            if (isCorrect) optionStyle = styles.optCorrect;
            else if (isSelected) optionStyle = styles.optWrong;
          }

          return (
            <Pressable
              key={option.code}
              onPress={() => handleSelectOption(idx)}
              disabled={isAnswered}
              style={[styles.optButton, optionStyle]}
            >
              <Text
                style={[
                  styles.optText,
                  isAnswered && isCorrect && styles.optTextCorrect,
                  isAnswered && isSelected && !isCorrect && styles.optTextWrong,
                ]}
              >
                {option.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: IOSColors.systemBackground,
  },
  // Difficulty Selection Styles
  diffHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  diffHeaderTitleWrap: {
    alignItems: 'center',
  },
  diffPretitle: {
    fontSize: 11,
    fontWeight: '800',
    color: IOSColors.systemOrange,
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  diffTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: IOSColors.label,
  },
  diffScroll: {
    flex: 1,
  },
  diffScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  diffSubtitle: {
    fontSize: 14,
    color: IOSColors.secondaryLabel,
    lineHeight: 20,
    marginBottom: 18,
    textAlign: 'center',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
  },
  diffCardHard: {
    borderColor: 'rgba(255, 59, 48, 0.4)',
    backgroundColor: '#FFFFFF',
  },
  diffCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  diffIconGradient: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  diffCardHeadText: {
    flex: 1,
    justifyContent: 'center',
  },
  diffTagBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 4,
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
  diffPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  diffRulePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  diffRulePillText: {
    fontSize: 12,
    fontWeight: '700',
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
    fontSize: 13,
    fontWeight: '700',
    color: IOSColors.systemBlue,
  },
  diffArrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diffTipBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
    gap: 10,
  },
  diffTipText: {
    fontSize: 12,
    color: IOSColors.secondaryLabel,
    flex: 1,
    lineHeight: 18,
  },

  // In-Game Blitz Header & Elements
  blitzTopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  closeBtn: {
    padding: 2,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    ...IOSColors.cardShadow,
  },
  timerPillUrgent: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  timerText: {
    fontSize: 18,
    fontWeight: '800',
    color: IOSColors.systemBlue,
    marginLeft: 6,
  },
  timerTextUrgent: {
    color: '#FF3B30',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scorePill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    ...IOSColors.cardShadow,
  },
  scorePillText: {
    fontSize: 14,
    fontWeight: '700',
    color: IOSColors.label,
  },
  bonusBadge: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 14,
    marginVertical: 4,
  },
  bonusPositive: {
    backgroundColor: IOSColors.systemGreen,
  },
  bonusNegative: {
    backgroundColor: IOSColors.systemRed,
  },
  bonusBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  flagCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 24,
    ...IOSColors.cardShadow,
  },
  prompt: {
    fontSize: 15,
    fontWeight: '600',
    color: IOSColors.secondaryLabel,
    marginBottom: 12,
  },
  continentHint: {
    fontSize: 13,
    fontWeight: '600',
    color: IOSColors.tertiaryLabel,
    marginTop: 12,
  },
  optionsWrap: {
    paddingHorizontal: 20,
    gap: 12,
  },
  optButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    ...IOSColors.cardShadow,
  },
  optBase: {},
  optCorrect: {
    backgroundColor: IOSColors.correctCardBackground,
    borderColor: IOSColors.systemGreen,
    elevation: 2,
  },
  optWrong: {
    backgroundColor: IOSColors.wrongCardBackground,
    borderColor: IOSColors.systemRed,
    elevation: 2,
  },
  optText: {
    fontSize: 18,
    fontWeight: '700',
    color: IOSColors.label,
  },
  optTextCorrect: {
    color: IOSColors.systemGreen,
  },
  optTextWrong: {
    color: IOSColors.systemRed,
  },

  // Game Over Styles
  gameOverWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  blitzPretitle: {
    fontSize: 13,
    fontWeight: '800',
    color: IOSColors.systemRed,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  blitzRank: {
    fontSize: 28,
    fontWeight: '900',
    color: IOSColors.label,
    marginBottom: 12,
  },
  diffBadgeGameOver: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  diffBadgeGameOverText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  scoreCircle: {
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    ...IOSColors.cardShadowLarge,
  },
  bigScore: {
    fontSize: 46,
    fontWeight: '900',
    color: IOSColors.systemBlue,
  },
  bigScoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: IOSColors.secondaryLabel,
  },
  statCardsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    ...IOSColors.cardShadow,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: IOSColors.secondaryLabel,
    fontWeight: '500',
  },
  actions: {
    width: '100%',
  },
  reviewBadgeHintBlitz: {
    position: 'absolute',
    top: 10,
    right: 16,
    backgroundColor: IOSColors.systemBlue,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  reviewBadgeHintText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  exitLinkBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  exitLinkBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: IOSColors.secondaryLabel,
  },
  blitzCountBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    ...IOSColors.cardShadow,
  },
  blitzCountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  blitzCountTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: IOSColors.secondaryLabel,
    letterSpacing: 0.8,
  },
  blitzCountSub: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF3B30',
  },
  blitzCountChips: {
    flexDirection: 'row',
    gap: 8,
  },
  blitzCountChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  blitzCountChipActive: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },
  blitzCountChipText: {
    fontSize: 13,
    fontWeight: '800',
    color: IOSColors.label,
  },
  blitzCountChipTextActive: {
    color: '#FFFFFF',
  },
});
