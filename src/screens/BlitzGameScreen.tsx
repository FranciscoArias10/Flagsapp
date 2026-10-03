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
import { GameStartModal } from '../components/GameStartModal';
import { useGame } from '../context/GameContext';
import { useTheme } from '../context/ThemeContext';

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
  const { recordAnswer, recordGameStart, recordQuizResult, stats } = useGame();
  const { isDark, colors } = useTheme();
  const hasCountedGameRef = useRef(false);

  const [screenMode, setScreenMode] = useState<ScreenMode>('difficulty_select');
  const [selectedDifficulty, setSelectedDifficulty] = useState<BlitzDifficulty>('medium');
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<number | 'all'>(10);
  const [pendingBlitzDiff, setPendingBlitzDiff] = useState<BlitzDifficultyConfig | null>(null);
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

  // Retry & Second Chance mechanics
  const [isRetryRound, setIsRetryRound] = useState(false);
  const [retryCountryCodes, setRetryCountryCodes] = useState<string[]>([]);
  const [hasSecondChance, setHasSecondChance] = useState(false);
  const [eliminatedOptionIdx, setEliminatedOptionIdx] = useState<number | null>(null);
  const questionStartTimeRef = useRef<number>(Date.now());

  // Animations
  const timerScale = useRef(new Animated.Value(1)).current;
  const cardScale = useRef(new Animated.Value(0.95)).current;
  const bonusAnim = useRef(new Animated.Value(0)).current;
  const [bonusText, setBonusText] = useState<string | null>(null);

  // Timer interval (pure countdown)
  useEffect(() => {
    if (screenMode !== 'playing') return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [screenMode]);

  // Handle game over safely in an effect hook (avoids updating GameProvider during render)
  useEffect(() => {
    if (screenMode !== 'playing') return;

    if (timeLeft <= 0) {
      handleGameOver();
    } else {
      const urgentThreshold = selectedDifficulty === 'hard' ? 3 : 5;
      if (timeLeft <= urgentThreshold) {
        // Heartbeat pulse when time is running low
        Animated.sequence([
          Animated.timing(timerScale, { toValue: 1.15, duration: 100, useNativeDriver: true }),
          Animated.timing(timerScale, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();
        soundService.triggerCountdownTick();
      }
    }
  }, [screenMode, timeLeft, selectedDifficulty]);

  const generateNextQuestion = (poolParam?: string[]) => {
    const poolCodes = poolParam || (isRetryRound ? retryCountryCodes : null);
    let randomTarget: Country;
    if (poolCodes && poolCodes.length > 0) {
      const targetCode = poolCodes[Math.floor(Math.random() * poolCodes.length)];
      randomTarget = COUNTRIES.find((c) => c.code === targetCode) || COUNTRIES[0];
    } else {
      randomTarget = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
    }

    const distractors = COUNTRIES
      .filter((c) => c.code !== randomTarget.code)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    const options = [randomTarget, ...distractors].sort(() => 0.5 - Math.random());
    const correctIndex = options.findIndex((c) => c.code === randomTarget.code);

    setCurrentQ({ target: randomTarget, options, correctIndex });
    setSelectedIdx(null);
    setEliminatedOptionIdx(null);
    setIsAnswered(false);
    questionStartTimeRef.current = Date.now();

    cardScale.setValue(0.94);
    Animated.spring(cardScale, { toValue: 1, friction: 6, useNativeDriver: true }).start();
  };

  const showBonusPopup = (text: string) => {
    setBonusText(text);
    bonusAnim.setValue(0);
    Animated.sequence([
      Animated.timing(bonusAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(600),
      Animated.timing(bonusAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const startBlitzWithDifficulty = (diff: BlitzDifficulty, countParam?: number | 'all') => {
    soundService.triggerSelection();
    setSelectedDifficulty(diff);
    if (countParam !== undefined) {
      setSelectedQuestionCount(countParam);
    }
    setIsRetryRound(false);
    hasCountedGameRef.current = false;
    setRetryCountryCodes([]);
    setEliminatedOptionIdx(null);
    setHasSecondChance(false);
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

  const startRetryFailedBlitz = () => {
    const failedItems = reviewItems.filter((i) => !i.isCorrect);
    if (failedItems.length === 0) return;

    soundService.triggerSelection();
    setIsRetryRound(true);
    hasCountedGameRef.current = false;
    const failedCodes = failedItems.map((f) => f.countryCode).filter(Boolean) as string[];
    setRetryCountryCodes(failedCodes);
    setTimeLeft(BLITZ_DIFFICULTIES[selectedDifficulty].seconds);
    setScore(0);
    setStreak(0);
    setHighestStreak(0);
    setReviewItems([]);
    setShowConfetti(false);
    setShowReviewModal(false);
    setBonusText(null);
    setSelectedIdx(null);
    setEliminatedOptionIdx(null);
    setHasSecondChance(false);
    setIsAnswered(false);
    setScreenMode('playing');
    generateNextQuestion(failedCodes);
  };

  const restartBlitz = () => {
    startBlitzWithDifficulty(selectedDifficulty);
  };

  const handleChangeDifficulty = () => {
    soundService.triggerLightTap();
    setScreenMode('difficulty_select');
  };

  const handleSelectOption = (idx: number) => {
    if (isAnswered || !currentQ || screenMode !== 'playing' || eliminatedOptionIdx === idx) return;

    const isCorrect = idx === currentQ.correctIndex;
    const fastOpportunityEnabled = stats.fastAnswerOpportunityEnabled !== false;
    const elapsedSeconds = (Date.now() - questionStartTimeRef.current) / 1000;

    // Fast Answer Second Chance Shield Defense
    if (!isCorrect && fastOpportunityEnabled && hasSecondChance) {
      setHasSecondChance(false);
      setEliminatedOptionIdx(idx);
      soundService.triggerShield();
      showBonusPopup('🛡️ ¡Escudo Salvavidas! 0s penalización');
      return;
    }

    setSelectedIdx(idx);
    setIsAnswered(true);

    // Fast Answer Second Chance Shield Reward (ultra fast in blitz: <= 1.8s)
    if (isCorrect && fastOpportunityEnabled && !hasSecondChance && elapsedSeconds <= 1.8) {
      setHasSecondChance(true);
      soundService.triggerShield();
      showBonusPopup('⚡ ¡Relámpago! +1 Escudo 🛡️');
    }

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
      setTimeLeft((prev) => prev + diffConfig.bonus);
      showBonusPopup(`+${diffConfig.bonus}s`);
      if (nextStreak > 0 && nextStreak % 5 === 0) {
        soundService.triggerStreak();
      } else {
        soundService.triggerSuccess();
      }
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

    recordQuizResult(result, selectedDifficulty, 'blitz', hasCountedGameRef.current);
    hasCountedGameRef.current = true;

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
      <View style={[styles.container, { backgroundColor: colors.systemBackground, paddingTop: topInset, paddingBottom: Math.max(insets.bottom, 20) }]}>
        {/* Header with Close */}
        <View style={styles.diffHeaderBar}>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
            <Ionicons name="close-circle" size={32} color={colors.tertiaryLabel} />
          </Pressable>
          <View style={styles.diffHeaderTitleWrap}>
            <Text style={[styles.diffPretitle, { color: colors.systemOrange }]}>MODO CONTRARRELOJ</Text>
            <Text style={[styles.diffTitle, { color: colors.label }]} numberOfLines={1} adjustsFontSizeToFit>
              Desafío Blitz
            </Text>
          </View>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          style={styles.diffScroll}
          contentContainerStyle={[styles.diffScrollContent, { paddingBottom: 40 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.diffSubtitle, { color: colors.secondaryLabel }]}>
            Selecciona tu nivel de adrenalina. Cada acierto suma segundos al reloj, pero cada error te restará tiempo:
          </Text>

          {/* Cards for each difficulty */}
          {(Object.keys(BLITZ_DIFFICULTIES) as BlitzDifficulty[]).map((key) => {
            const diff = BLITZ_DIFFICULTIES[key];
            const isFeatured = key === 'medium';
            const isHard = key === 'hard';

            return (
              <Pressable
                key={diff.key}
                onPress={() => {
                  soundService.triggerMediumTap();
                  setPendingBlitzDiff(diff);
                }}
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
                    <View style={[styles.diffTagBadge, { backgroundColor: diff.tagBg }]}>
                      <Text style={[styles.diffTagBadgeText, { color: diff.tagColor }]}>
                        {diff.tag}
                      </Text>
                    </View>
                    <Text style={[styles.diffCardTitle, { color: colors.label }]} numberOfLines={1} adjustsFontSizeToFit>
                      {diff.title}
                    </Text>
                    <Text style={[styles.diffCardSubtitle, { color: colors.secondaryLabel }]} numberOfLines={1}>
                      {diff.subtitle}
                    </Text>
                  </View>
                </View>

                {/* Rules Pills Row */}
                <View style={styles.diffPillsRow}>
                  <View style={[styles.diffRulePill, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)' }]}>
                    <Ionicons name="timer-outline" size={14} color={diff.color} />
                    <Text style={[styles.diffRulePillText, { color: diff.color }]}>
                      {diff.seconds}s iniciales
                    </Text>
                  </View>
                  <View style={[styles.diffRulePill, { backgroundColor: 'rgba(52, 199, 89, 0.12)' }]}>
                    <Ionicons name="add-circle-outline" size={14} color={colors.systemGreen} />
                    <Text style={[styles.diffRulePillText, { color: colors.systemGreen }]}>
                      +{diff.bonus}s acierto
                    </Text>
                  </View>
                  <View style={[styles.diffRulePill, { backgroundColor: 'rgba(255, 59, 48, 0.12)' }]}>
                    <Ionicons name="remove-circle-outline" size={14} color={colors.systemRed} />
                    <Text style={[styles.diffRulePillText, { color: colors.systemRed }]}>
                      -{diff.penalty}s fallo
                    </Text>
                  </View>
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

          <View style={[styles.diffTipBox, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)' }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.secondaryLabel} />
            <Text style={[styles.diffTipText, { color: colors.secondaryLabel }]}>
              En el modo Extremo tienes solo 5 segundos iniciales. ¡Necesitarás reflejos inmediatos de menos de un segundo para sobrevivir!
            </Text>
          </View>
        </ScrollView>

        {/* Game Start Settings Modal */}
        {pendingBlitzDiff && (
          <GameStartModal
            visible={pendingBlitzDiff !== null}
            onClose={() => setPendingBlitzDiff(null)}
            onStart={(count) => {
              const targetKey = pendingBlitzDiff.key;
              setPendingBlitzDiff(null);
              startBlitzWithDifficulty(targetKey, count);
            }}
            title={`Blitz ${pendingBlitzDiff.title}`}
            subtitle={pendingBlitzDiff.subtitle}
            icon={pendingBlitzDiff.icon}
            color={pendingBlitzDiff.color}
            gradient={pendingBlitzDiff.gradient}
            initialCount={selectedQuestionCount}
            initialTime={pendingBlitzDiff.seconds}
            showTimeSelector={false}
            totalAvailable={COUNTRIES.length}
          />
        )}
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
      <View style={[styles.container, { backgroundColor: colors.systemBackground, paddingTop: topInset, paddingBottom: Math.max(insets.bottom, 20) }]}>
        <ConfettiView active={showConfetti} onFinish={() => setShowConfetti(false)} />
        <View style={styles.gameOverWrap}>
          <Text style={[styles.blitzPretitle, { color: colors.systemOrange }]}>¡TIEMPO AGOTADO!</Text>
          <Text style={[styles.blitzRank, { color: colors.label }]}>{rankTitle}</Text>

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
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.cardBorder,
                borderWidth: 1,
              },
              colors.cardShadow,
              pressed && { transform: [{ scale: 0.95 }] },
            ]}
          >
            <View style={styles.reviewBadgeHintBlitz}>
              <Ionicons name="eye" size={11} color="#FFFFFF" />
              <Text style={styles.reviewBadgeHintText}>VER</Text>
            </View>
            <Text style={[styles.bigScore, { color: colors.label }]}>{score}</Text>
            <Text style={[styles.bigScoreLabel, { color: colors.systemBlue }]}>Aciertos 👆</Text>
          </Pressable>

          <View style={styles.statCardsGrid}>
            <View style={[styles.statBox, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1 }, colors.cardShadow]}>
              <Text style={[styles.statNumber, { color: colors.systemOrange }]}>{highestStreak} 🔥</Text>
              <Text style={[styles.statLabel, { color: colors.secondaryLabel }]}>Mejor Racha</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1 }, colors.cardShadow]}>
              <Text style={[styles.statNumber, { color: colors.systemPurple }]}>+{score * 35}</Text>
              <Text style={[styles.statLabel, { color: colors.secondaryLabel }]}>XP Total</Text>
            </View>
          </View>

          <View style={styles.actions}>
            {reviewItems.filter((i) => !i.isCorrect).length > 0 && (
              <AppleButton
                title={`🔁 Repasar Fallos (${reviewItems.filter((i) => !i.isCorrect).length})`}
                onPress={startRetryFailedBlitz}
                variant="gradient"
                style={{ width: '100%', marginBottom: 10 }}
              />
            )}

            <AppleButton
              title={`Jugar Otra Vez (${currentDiffConfig.title} ${currentDiffConfig.seconds}s)`}
              onPress={restartBlitz}
              variant={reviewItems.filter((i) => !i.isCorrect).length > 0 ? "secondary" : "gradient"}
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
              <Text style={[styles.exitLinkBtnText, { color: colors.secondaryLabel }]}>Volver al Menú</Text>
            </Pressable>
          </View>
        </View>

        <ReviewAnswersModal
          visible={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          items={reviewItems}
          title={isRetryRound ? "Recuento de Repaso Blitz" : `Recuento Blitz (${currentDiffConfig.title} ${currentDiffConfig.seconds}s)`}
          onRetryFailures={reviewItems.filter((i) => !i.isCorrect).length > 0 ? startRetryFailedBlitz : undefined}
        />
      </View>
    );
  }

  // 3. PLAYING SCREEN
  if (!currentQ) return null;

  const urgentThreshold = selectedDifficulty === 'hard' ? 2 : 4;
  const isLowTime = timeLeft <= urgentThreshold;

  const handleClosePlaying = () => {
    soundService.triggerLightTap();
    if (screenMode === 'playing' && hasCountedGameRef.current && reviewItems.length > 0) {
      const finalScore = score;
      const total = Math.max(1, reviewItems.length);
      const xpEarned = calculateXpEarned(finalScore, total, highestStreak, finalScore * 10);
      const result: QuizResult = {
        score: finalScore,
        totalQuestions: total,
        xpEarned,
        accuracy: Math.round((finalScore / total) * 100),
        highestStreak,
        stars: finalScore >= 12 ? 3 : finalScore >= 7 ? 2 : 1,
      };
      recordQuizResult(result, selectedDifficulty, 'blitz', true);
    }
    onClose();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.systemBackground, paddingTop: topInset, paddingBottom: Math.max(insets.bottom, 20) }]}>
      {/* Top Blitz Header */}
      <View style={styles.blitzTopHeader}>
        <Pressable onPress={handleClosePlaying} style={styles.closeBtn} hitSlop={12}>
          <Ionicons name="close-circle" size={30} color={colors.tertiaryLabel} />
        </Pressable>

        {/* Central Timer */}
        <Animated.View
          style={[
            styles.timerPill,
            { backgroundColor: isDark ? 'rgba(10, 132, 255, 0.2)' : 'rgba(0, 122, 255, 0.1)' },
            isLowTime && styles.timerPillUrgent,
            { transform: [{ scale: timerScale }] },
          ]}
        >
          <Ionicons
            name="timer"
            size={18}
            color={isLowTime ? '#FF3B30' : colors.systemBlue}
          />
          <Text style={[styles.timerText, { color: isLowTime ? '#FF3B30' : colors.systemBlue }, isLowTime && styles.timerTextUrgent]}>
            {timeLeft}s
          </Text>
        </Animated.View>

        {/* Streak & Score */}
        <View style={styles.headerRight}>
          {hasSecondChance && (
            <View style={styles.shieldPillBlitz}>
              <Ionicons name="shield-checkmark" size={12} color="#0284C7" />
              <Text style={styles.shieldPillBlitzText}>Escudo</Text>
            </View>
          )}
          <StreakBadge streak={streak} size="small" />
          <View style={[styles.scorePill, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }]}>
            <Text style={[styles.scorePillText, { color: colors.label }]}>
              pts: {score}{selectedQuestionCount !== 'all' ? ` (${Math.min(reviewItems.length + 1, selectedQuestionCount)}/${selectedQuestionCount})` : ''}
            </Text>
          </View>
        </View>
      </View>

      {isRetryRound && (
        <View style={styles.retryBadgeBar}>
          <Ionicons name="repeat" size={12} color="#D97706" />
          <Text style={styles.retryBadgeBarText}>REPASO BLITZ ({retryCountryCodes.length} FALLOS)</Text>
        </View>
      )}

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
      <Animated.View
        style={[
          styles.flagCard,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.cardBorder,
            borderWidth: 1,
            transform: [{ scale: cardScale }],
          },
          colors.cardShadow,
        ]}
      >
        <Text style={[styles.prompt, { color: colors.secondaryLabel }]}>Identifica rápido:</Text>
        <FlagImage
          countryCode={currentQ.target.code}
          fallbackEmoji={currentQ.target.flagEmoji}
          width={240}
          height={150}
          borderRadius={20}
        />
        <Text style={[styles.continentHint, { color: colors.tertiaryLabel }]}>{currentQ.target.continent}</Text>
      </Animated.View>

      {/* 4 Quick Options */}
      <View style={styles.optionsWrap}>
        {currentQ.options.map((option, idx) => {
          const isSelected = selectedIdx === idx;
          const isCorrect = idx === currentQ.correctIndex;
          const isEliminated = eliminatedOptionIdx === idx;

          let optionStyle: any = {
            backgroundColor: colors.cardBackground,
            borderColor: colors.cardBorder,
          };
          if (isEliminated) {
            optionStyle = {
              backgroundColor: isDark ? 'rgba(255, 59, 48, 0.12)' : 'rgba(255, 59, 48, 0.06)',
              borderColor: isDark ? 'rgba(255, 59, 48, 0.35)' : 'rgba(255, 59, 48, 0.25)',
              opacity: 0.65,
            };
          } else if (isAnswered) {
            if (isCorrect) {
              optionStyle = {
                backgroundColor: colors.systemGreen,
                borderColor: colors.systemGreen,
              };
            } else if (isSelected) {
              optionStyle = {
                backgroundColor: colors.systemRed,
                borderColor: colors.systemRed,
              };
            }
          }

          return (
            <Pressable
              key={option.code}
              onPress={() => handleSelectOption(idx)}
              disabled={isAnswered || isEliminated}
              style={[
                styles.optButton,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.cardBorder,
                },
                colors.cardShadow,
                optionStyle,
              ]}
            >
              <Text
                style={[
                  styles.optText,
                  { color: colors.label },
                  isEliminated && styles.optTextEliminated,
                  isAnswered && isCorrect && styles.optTextCorrect,
                  isAnswered && isSelected && !isCorrect && styles.optTextWrong,
                ]}
              >
                {option.name}
              </Text>
              {isEliminated ? (
                <Ionicons name="shield" size={16} color={colors.systemRed} />
              ) : isAnswered && isCorrect ? (
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              ) : isAnswered && isSelected ? (
                <Ionicons name="close-circle" size={18} color="#FFFFFF" />
              ) : null}
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
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 17,
    fontWeight: '700',
    color: IOSColors.label,
    flex: 1,
    textAlign: 'center',
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
  shieldPillBlitz: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.3)',
    gap: 3,
    marginRight: 6,
  },
  shieldPillBlitzText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284C7',
  },
  retryBadgeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginHorizontal: 20,
    marginBottom: 8,
    gap: 5,
    alignSelf: 'center',
  },
  retryBadgeBarText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.5,
  },
  optEliminated: {
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    borderColor: 'rgba(255, 59, 48, 0.3)',
    opacity: 0.6,
  },
  optTextEliminated: {
    color: IOSColors.systemRed,
    textDecorationLine: 'line-through',
  },
});
