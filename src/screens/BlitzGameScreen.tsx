import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Country, QuizResult } from '../types';
import { COUNTRIES } from '../data/countries';
import { calculateXpEarned } from '../utils/quizGenerator';
import { IOSColors } from '../utils/colors';
import { soundService } from '../utils/soundHelper';
import { FlagImage } from '../components/FlagImage';
import { AppleButton } from '../components/AppleButton';
import { StreakBadge } from '../components/StreakBadge';
import { ConfettiView } from '../components/ConfettiView';
import { useGame } from '../context/GameContext';

interface BlitzQuestion {
  target: Country;
  options: Country[];
  correctIndex: number;
}

export const BlitzGameScreen: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { recordAnswer, recordQuizResult } = useGame();

  const [timeLeft, setTimeLeft] = useState(60);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentQ, setCurrentQ] = useState<BlitzQuestion | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [highestStreak, setHighestStreak] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Animations
  const timerScale = useRef(new Animated.Value(1)).current;
  const cardScale = useRef(new Animated.Value(0.95)).current;
  const bonusAnim = useRef(new Animated.Value(0)).current;
  const [bonusText, setBonusText] = useState<string | null>(null);

  // Timer interval
  useEffect(() => {
    generateNextQuestion();
  }, []);

  useEffect(() => {
    if (!isPlaying) return;

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
        if (prev <= 10) {
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
  }, [isPlaying, timeLeft]);

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

  const handleSelectOption = (idx: number) => {
    if (isAnswered || !currentQ || !isPlaying) return;

    setSelectedIdx(idx);
    setIsAnswered(true);

    const isCorrect = idx === currentQ.correctIndex;
    recordAnswer(isCorrect);

    if (isCorrect) {
      soundService.triggerSuccess();
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setHighestStreak((prev) => Math.max(prev, nextStreak));
      setScore((prev) => prev + 1);
      setTimeLeft((prev) => prev + 2); // +2s bonus
      showBonusPopup('+2s');

      // Instant transition
      setTimeout(() => {
        generateNextQuestion();
      }, 350);
    } else {
      soundService.triggerError();
      setStreak(0);
      setTimeLeft((prev) => Math.max(0, prev - 3)); // -3s penalty
      showBonusPopup('-3s');

      setTimeout(() => {
        generateNextQuestion();
      }, 500);
    }
  };

  const handleGameOver = () => {
    setIsPlaying(false);
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

    if (finalScore >= 10) {
      setShowConfetti(true);
      soundService.triggerCelebration();
    } else {
      soundService.triggerMediumTap();
    }
  };

  const restartBlitz = () => {
    setTimeLeft(60);
    setScore(0);
    setStreak(0);
    setHighestStreak(0);
    setShowConfetti(false);
    setIsPlaying(true);
    generateNextQuestion();
  };

  if (!isPlaying) {
    const rankTitle =
      score >= 18
        ? '⚡ Dios del Rayo'
        : score >= 12
        ? '🚀 Supersónico'
        : score >= 7
        ? '🏎️ Veloz'
        : '🧭 Explorador Ágil';

    return (
      <SafeAreaView style={styles.safeArea}>
        <ConfettiView active={showConfetti} onFinish={() => setShowConfetti(false)} />
        <View style={styles.gameOverWrap}>
          <Text style={styles.blitzPretitle}>¡TIEMPO AGOTADO!</Text>
          <Text style={styles.blitzRank}>{rankTitle}</Text>

          <View style={styles.scoreCircle}>
            <Text style={styles.bigScore}>{score}</Text>
            <Text style={styles.bigScoreLabel}>Aciertos</Text>
          </View>

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
              title="Jugar Blitz Otra Vez"
              onPress={restartBlitz}
              variant="gradient"
              style={{ width: '100%' }}
            />
            <AppleButton
              title="Volver al Menú"
              onPress={onClose}
              variant="secondary"
              style={{ width: '100%', marginTop: 12 }}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentQ) return null;

  const isLowTime = timeLeft <= 10;

  return (
    <SafeAreaView style={styles.safeArea}>
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
            <Text style={styles.scorePillText}>pts: {score}</Text>
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
                numberOfLines={1}
              >
                {option.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: IOSColors.systemBackground,
  },
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
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    borderColor: IOSColors.systemGreen,
  },
  optWrong: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderColor: IOSColors.systemRed,
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
  gameOverWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  blitzPretitle: {
    fontSize: 14,
    fontWeight: '800',
    color: IOSColors.systemRed,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  blitzRank: {
    fontSize: 32,
    fontWeight: '900',
    color: IOSColors.label,
    marginBottom: 24,
  },
  scoreCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    ...IOSColors.cardShadowLarge,
  },
  bigScore: {
    fontSize: 48,
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
    marginBottom: 32,
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    ...IOSColors.cardShadow,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: IOSColors.secondaryLabel,
    fontWeight: '500',
  },
  actions: {
    width: '100%',
  },
});
