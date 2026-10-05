import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Platform,
  StatusBar as RNStatusBar,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Country, QuizResult } from '../types';
import { COUNTRIES } from '../data/countries';
import { COUNTRY_CITIES } from '../data/countryCities';
import { IOSColors } from '../utils/colors';
import { soundService } from '../utils/soundHelper';
import { FlagImage } from './FlagImage';
import { AppleButton } from './AppleButton';
import { ConfettiView } from './ConfettiView';
import { useTheme } from '../context/ThemeContext';
import { useGame } from '../context/GameContext';
import { useLanguage } from '../context/LanguageContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CountryStudyModalProps {
  visible: boolean;
  country: Country | null;
  onClose: () => void;
}

type StudyStep = 'capital' | 'flag' | 'results';

export const CountryStudyModal: React.FC<CountryStudyModalProps> = ({
  visible,
  country,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) : 10);
  const { isDark, colors } = useTheme();
  const { recordAnswer, recordQuizResult } = useGame();
  const { language, t, getCountryName, getCapitalName, getCountryFact, getContinentName } = useLanguage();

  const [step, setStep] = useState<StudyStep>('capital');
  const [correctCount, setCorrectCount] = useState(0);

  // Capital question state
  const [capitalOptions, setCapitalOptions] = useState<string[]>([]);
  const [selectedCapital, setSelectedCapital] = useState<string | null>(null);
  const [isCapitalAnswered, setIsCapitalAnswered] = useState(false);

  // Flag question state
  const [flagOptions, setFlagOptions] = useState<Country[]>([]);
  const [selectedFlagCode, setSelectedFlagCode] = useState<string | null>(null);
  const [isFlagAnswered, setIsFlagAnswered] = useState(false);

  // Results state
  const [showConfetti, setShowConfetti] = useState(false);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animation values
  const cardScale = useRef(new Animated.Value(0.94)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  // Initialize micro-quiz questions whenever country or modal opens
  useEffect(() => {
    if (visible && country) {
      initStudySession(country);
    } else {
      clearTimers();
    }
    return () => clearTimers();
  }, [visible, country]);

  const clearTimers = () => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
  };

  const triggerStepTransition = () => {
    cardScale.setValue(0.94);
    cardOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const initStudySession = (targetCountry: Country) => {
    clearTimers();
    setStep('capital');
    setCorrectCount(0);
    setSelectedCapital(null);
    setIsCapitalAnswered(false);
    setSelectedFlagCode(null);
    setIsFlagAnswered(false);
    setShowConfetti(false);

    // 1. Generate Capital Options (localized)
    const correctCap = getCapitalName(targetCountry.code, targetCountry.capital);
    const sameCountryCities = (COUNTRY_CITIES[targetCountry.code] || []).filter(
      (c) => c.toLowerCase() !== correctCap.toLowerCase()
    );

    let distractors: string[] = [];
    if (sameCountryCities.length >= 3) {
      const shuffled = [...sameCountryCities].sort(() => Math.random() - 0.5);
      distractors = shuffled.slice(0, 3);
    } else {
      // Pick capitals from other countries (prefer same continent)
      const sameContinentCapitals = COUNTRIES.filter(
        (c) => c.code !== targetCountry.code && c.continent === targetCountry.continent
      ).map((c) => getCapitalName(c.code, c.capital));

      const otherContinentCapitals = COUNTRIES.filter(
        (c) => c.code !== targetCountry.code && c.continent !== targetCountry.continent
      ).map((c) => getCapitalName(c.code, c.capital));

      const combinedPool = [...sameContinentCapitals, ...otherContinentCapitals];
      const shuffledCombined = combinedPool.sort(() => Math.random() - 0.5);

      distractors = [
        ...sameCountryCities,
        ...shuffledCombined.slice(0, 3 - sameCountryCities.length),
      ];
    }

    const shuffledCapitalOptions = [correctCap, ...distractors].sort(() => Math.random() - 0.5);
    setCapitalOptions(shuffledCapitalOptions);

    // 2. Generate Flag Options
    const sameContinentCountries = COUNTRIES.filter(
      (c) => c.code !== targetCountry.code && c.continent === targetCountry.continent
    );
    const otherCountries = COUNTRIES.filter(
      (c) => c.code !== targetCountry.code && c.continent !== targetCountry.continent
    );

    const flagDistractorPool =
      sameContinentCountries.length >= 3
        ? sameContinentCountries.sort(() => Math.random() - 0.5).slice(0, 3)
        : [
            ...sameContinentCountries,
            ...otherCountries.sort(() => Math.random() - 0.5).slice(0, 3 - sameContinentCountries.length),
          ];

    const shuffledFlags = [targetCountry, ...flagDistractorPool].sort(() => Math.random() - 0.5);
    setFlagOptions(shuffledFlags);

    triggerStepTransition();
  };

  const handleSelectCapital = (chosenCapital: string) => {
    if (!country || isCapitalAnswered) return;

    setIsCapitalAnswered(true);
    setSelectedCapital(chosenCapital);

    const correctCap = getCapitalName(country.code, country.capital);
    const isCorrect = chosenCapital === correctCap;
    if (isCorrect) {
      soundService.triggerSuccess();
      setCorrectCount((prev) => prev + 1);
    } else {
      soundService.triggerError();
    }
    recordAnswer(isCorrect);

    // Auto-advance to Flag step
    autoAdvanceTimer.current = setTimeout(() => {
      setStep('flag');
      triggerStepTransition();
    }, 1250);
  };

  const handleSelectFlag = (chosenCountry: Country) => {
    if (!country || isFlagAnswered) return;

    setIsFlagAnswered(true);
    setSelectedFlagCode(chosenCountry.code);

    const isCorrect = chosenCountry.code === country.code;
    const finalScore = isCorrect ? correctCount + 1 : correctCount;

    if (isCorrect) {
      soundService.triggerSuccess();
      setCorrectCount(finalScore);
    } else {
      soundService.triggerError();
    }
    recordAnswer(isCorrect);

    // Auto-advance to Results
    autoAdvanceTimer.current = setTimeout(() => {
      setStep('results');
      triggerStepTransition();

      const xpEarned = finalScore === 2 ? 30 : finalScore === 1 ? 15 : 5;
      const stars = finalScore === 2 ? 3 : finalScore === 1 ? 1 : 0;

      const studyResult: QuizResult = {
        score: finalScore,
        totalQuestions: 2,
        xpEarned,
        accuracy: finalScore === 2 ? 100 : finalScore === 1 ? 50 : 0,
        highestStreak: finalScore,
        stars,
      };

      recordQuizResult(studyResult, country.continent, 'study', true);

      if (finalScore === 2) {
        soundService.triggerCelebration();
        setShowConfetti(true);
      }
    }, 1250);
  };

  if (!country) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.systemBackground,
            paddingTop: topInset,
            paddingBottom: Math.max(insets.bottom, 20),
          },
        ]}
      >
        <ConfettiView active={showConfetti} onFinish={() => setShowConfetti(false)} />

        {/* Modal Top Bar */}
        <View style={styles.topBar}>
          <View style={[styles.grabber, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(60, 60, 67, 0.3)' }]} />
          <View style={styles.topBarContent}>
            <View style={styles.modeBadge}>
              <Ionicons name="school" size={13} color={colors.systemBlue} />
              <Text style={[styles.modeBadgeText, { color: colors.systemBlue }]}>
                {t('study_badge')}
              </Text>
            </View>

            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Ionicons name="close-circle" size={28} color={colors.tertiaryLabel} />
            </Pressable>
          </View>

          {/* Progress Indicator */}
          <View style={styles.stepsTracker}>
            <View
              style={[
                styles.stepSegment,
                step === 'capital' || step === 'flag' || step === 'results'
                  ? { backgroundColor: colors.systemBlue }
                  : { backgroundColor: colors.surface },
              ]}
            />
            <View
              style={[
                styles.stepSegment,
                step === 'flag' || step === 'results'
                  ? { backgroundColor: colors.systemBlue }
                  : { backgroundColor: colors.surface },
              ]}
            />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* STEP 1: CAPITAL QUESTION */}
          {step === 'capital' && (
            <Animated.View
              style={[
                styles.questionWrap,
                {
                  opacity: cardOpacity,
                  transform: [{ scale: cardScale }],
                },
              ]}
            >
              <Text style={[styles.stepSubtitle, { color: colors.secondaryLabel }]}>
                {t('study_step_1')}
              </Text>
              <Text style={[styles.questionTitle, { color: colors.label }]}>
                {t('study_capital_question', { country: getCountryName(country.code, country.name) })}
              </Text>

              <View
                style={[
                  styles.countrySpotlight,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.cardBorder,
                    borderWidth: 1,
                  },
                  colors.cardShadow,
                ]}
              >
                <FlagImage
                  countryCode={country.code}
                  fallbackEmoji={country.flagEmoji}
                  width={140}
                  height={90}
                  borderRadius={14}
                />
                <View style={styles.continentPill}>
                  <Ionicons name="location-sharp" size={13} color={colors.systemBlue} />
                  <Text style={[styles.continentPillText, { color: colors.systemBlue }]}>
                    {getContinentName(country.continent)}
                  </Text>
                </View>
              </View>

              {/* Capital Options */}
              <View style={styles.optionsList}>
                {capitalOptions.map((opt) => {
                  const isSelected = selectedCapital === opt;
                  const isCorrect = opt === country.capital;

                  let optCardStyle: any = {
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.cardBorder,
                  };

                  if (isCapitalAnswered) {
                    if (isCorrect) {
                      optCardStyle = {
                        backgroundColor: colors.correctCardBackground,
                        borderColor: colors.systemGreen,
                        borderWidth: 1.5,
                      };
                    } else if (isSelected) {
                      optCardStyle = {
                        backgroundColor: colors.wrongCardBackground,
                        borderColor: colors.systemRed,
                        borderWidth: 1.5,
                      };
                    }
                  }

                  return (
                    <Pressable
                      key={opt}
                      onPress={() => handleSelectCapital(opt)}
                      disabled={isCapitalAnswered}
                      style={[
                        styles.optionButton,
                        {
                          backgroundColor: colors.cardBackground,
                          borderColor: colors.cardBorder,
                        },
                        colors.cardShadow,
                        optCardStyle,
                      ]}
                    >
                      <View style={styles.optionRow}>
                        <Ionicons
                          name="business-outline"
                          size={18}
                          color={
                            isCapitalAnswered && isCorrect
                              ? colors.systemGreen
                              : isCapitalAnswered && isSelected
                              ? colors.systemRed
                              : colors.systemPurple
                          }
                          style={{ marginRight: 10 }}
                        />
                        <Text
                          style={[
                            styles.optionText,
                            { color: colors.label },
                            isCapitalAnswered && isCorrect && { color: colors.systemGreen, fontWeight: '700' },
                            isCapitalAnswered && isSelected && !isCorrect && { color: colors.systemRed },
                          ]}
                        >
                          {opt}
                        </Text>
                      </View>

                      {isCapitalAnswered && isCorrect && (
                        <Ionicons name="checkmark-circle" size={22} color={colors.systemGreen} />
                      )}
                      {isCapitalAnswered && isSelected && !isCorrect && (
                        <Ionicons name="close-circle" size={22} color={colors.systemRed} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>
          )}

          {/* STEP 2: FLAG QUESTION */}
          {step === 'flag' && (
            <Animated.View
              style={[
                styles.questionWrap,
                {
                  opacity: cardOpacity,
                  transform: [{ scale: cardScale }],
                },
              ]}
            >
              <Text style={[styles.stepSubtitle, { color: colors.secondaryLabel }]}>
                {t('study_step_2')}
              </Text>
              <Text style={[styles.questionTitle, { color: colors.label }]}>
                {t('study_flag_question', { country: getCountryName(country.code, country.name) })}
              </Text>

              <View style={styles.hintBanner}>
                <Ionicons name="information-circle" size={16} color={colors.systemBlue} />
                <Text style={[styles.hintText, { color: colors.secondaryLabel }]}>
                  {t('atlas_detail_capital')}: <Text style={{ fontWeight: '700', color: colors.label }}>{getCapitalName(country.code, country.capital)}</Text> • {getContinentName(country.continent)}
                </Text>
              </View>

              {/* 4 Flag Cards in 2x2 Grid */}
              <View style={styles.flagsGrid}>
                {flagOptions.map((fCountry) => {
                  const isSelected = selectedFlagCode === fCountry.code;
                  const isCorrect = fCountry.code === country.code;

                  let flagBorderColor = colors.cardBorder;
                  let flagBg = colors.cardBackground;

                  if (isFlagAnswered) {
                    if (isCorrect) {
                      flagBorderColor = colors.systemGreen;
                      flagBg = colors.correctCardBackground;
                    } else if (isSelected) {
                      flagBorderColor = colors.systemRed;
                      flagBg = colors.wrongCardBackground;
                    }
                  }

                  const cardW = (SCREEN_WIDTH - 56) / 2;

                  return (
                    <Pressable
                      key={fCountry.code}
                      onPress={() => handleSelectFlag(fCountry)}
                      disabled={isFlagAnswered}
                      style={[
                        styles.flagCardOption,
                        {
                          width: cardW,
                          backgroundColor: flagBg,
                          borderColor: flagBorderColor,
                          borderWidth: isFlagAnswered && (isCorrect || isSelected) ? 2 : 1,
                        },
                        colors.cardShadow,
                      ]}
                    >
                      <FlagImage
                        countryCode={fCountry.code}
                        fallbackEmoji={fCountry.flagEmoji}
                        width={cardW - 24}
                        height={75}
                        borderRadius={10}
                      />

                      {isFlagAnswered && isCorrect && (
                        <View style={styles.flagCheckBadge}>
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        </View>
                      )}
                      {isFlagAnswered && isSelected && !isCorrect && (
                        <View style={[styles.flagCheckBadge, { backgroundColor: colors.systemRed }]}>
                          <Ionicons name="close" size={14} color="#FFFFFF" />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>
          )}

          {/* STEP 3: RESULTS SUMMARY */}
          {step === 'results' && (
            <Animated.View
              style={[
                styles.resultsWrap,
                {
                  opacity: cardOpacity,
                  transform: [{ scale: cardScale }],
                },
              ]}
            >
              {/* Star Rating Badge */}
              <View style={styles.starsRow}>
                <Ionicons
                  name="star"
                  size={42}
                  color={correctCount >= 1 ? colors.goldStar : isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(120, 120, 128, 0.2)'}
                />
                <Ionicons
                  name="star"
                  size={58}
                  color={correctCount === 2 ? colors.goldStar : isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(120, 120, 128, 0.2)'}
                  style={styles.centerStar}
                />
                <Ionicons
                  name="star"
                  size={42}
                  color={correctCount === 2 ? colors.goldStar : isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(120, 120, 128, 0.2)'}
                />
              </View>

              <Text style={[styles.resultsPretitle, { color: colors.systemBlue }]}>
                {t('study_results_complete')}
              </Text>
              <Text style={[styles.resultsTitle, { color: colors.label }]}>
                {correctCount === 2
                  ? t('study_results_mastered', { country: getCountryName(country.code, country.name) })
                  : correctCount === 1
                  ? t('study_results_good_try')
                  : t('study_results_keep_practicing')}
              </Text>

              {/* Stats Box */}
              <View style={styles.resultsStatRow}>
                <View
                  style={[
                    styles.resultsStatBox,
                    {
                      backgroundColor: colors.cardBackground,
                      borderColor: colors.cardBorder,
                      borderWidth: 1,
                    },
                    colors.cardShadow,
                  ]}
                >
                  <Text style={[styles.resultsStatVal, { color: colors.label }]}>
                    {correctCount} / 2
                  </Text>
                  <Text style={[styles.resultsStatLbl, { color: colors.secondaryLabel }]}>
                    {t('study_results_corrects')}
                  </Text>
                </View>

                <View
                  style={[
                    styles.resultsStatBox,
                    {
                      backgroundColor: colors.cardBackground,
                      borderColor: colors.cardBorder,
                      borderWidth: 1,
                    },
                    colors.cardShadow,
                  ]}
                >
                  <Text style={[styles.resultsStatVal, { color: colors.systemPurple }]}>
                    +{correctCount === 2 ? 30 : correctCount === 1 ? 15 : 5}
                  </Text>
                  <Text style={[styles.resultsStatLbl, { color: colors.secondaryLabel }]}>
                    {t('study_results_xp_earned')}
                  </Text>
                </View>
              </View>

              {/* Educational Fact Review */}
              <View
                style={[
                  styles.reviewFactCard,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.cardBorder,
                    borderWidth: 1,
                  },
                  colors.cardShadow,
                ]}
              >
                <View style={styles.reviewFactHead}>
                  <Ionicons name="bulb" size={18} color={colors.systemOrange} />
                  <Text style={[styles.reviewFactTitle, { color: colors.systemOrange }]}>
                    {t('study_results_review_sheet', { country: getCountryName(country.code, country.name) })}
                  </Text>
                </View>
                <Text style={[styles.reviewFactBody, { color: colors.label }]}>
                  {getCountryFact(country.code, country.fact)}
                </Text>
                <View style={styles.reviewMetaRow}>
                  <Text style={[styles.reviewMetaText, { color: colors.secondaryLabel }]}>
                    {t('atlas_detail_capital')}: <Text style={{ fontWeight: '700', color: colors.label }}>{getCapitalName(country.code, country.capital)}</Text>
                  </Text>
                  <Text style={[styles.reviewMetaText, { color: colors.secondaryLabel }]}>
                    {t('atlas_detail_population')}: {country.population}
                  </Text>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.resultsActions}>
                <AppleButton
                  title={t('study_btn_practice_again')}
                  variant="gradient"
                  onPress={() => initStudySession(country)}
                  style={{ width: '100%', marginBottom: 10 }}
                />
                <AppleButton
                  title={t('study_btn_back_atlas')}
                  variant="secondary"
                  onPress={onClose}
                  style={{ width: '100%' }}
                />
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 8,
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: 3,
    marginBottom: 8,
  },
  topBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  modeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  closeBtn: {
    padding: 2,
  },
  stepsTracker: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    marginTop: 12,
  },
  stepSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 8,
  },
  questionWrap: {
    alignItems: 'center',
    width: '100%',
  },
  stepSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  questionTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  countrySpotlight: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    marginBottom: 20,
    width: '100%',
  },
  continentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 12,
    gap: 4,
  },
  continentPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  optionsList: {
    width: '100%',
    gap: 10,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  hintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 18,
    gap: 6,
    alignSelf: 'stretch',
  },
  hintText: {
    fontSize: 13,
  },
  flagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  flagCardOption: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    position: 'relative',
  },
  flagCheckBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsWrap: {
    alignItems: 'center',
    width: '100%',
    paddingTop: 10,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  centerStar: {
    marginHorizontal: 14,
    top: -8,
  },
  resultsPretitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  resultsTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 20,
    textAlign: 'center',
  },
  resultsStatRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 18,
  },
  resultsStatBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
  },
  resultsStatVal: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  resultsStatLbl: {
    fontSize: 12,
    fontWeight: '500',
  },
  reviewFactCard: {
    width: '100%',
    padding: 16,
    borderRadius: 18,
    marginBottom: 24,
  },
  reviewFactHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  reviewFactTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  reviewFactBody: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  reviewMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(120, 120, 128, 0.2)',
    paddingTop: 10,
  },
  reviewMetaText: {
    fontSize: 12,
  },
  resultsActions: {
    width: '100%',
  },
});
