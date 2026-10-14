import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppleCard } from './AppleCard';
import { ProgressBar } from './ProgressBar';
import { SegmentedControl } from './SegmentedControl';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Continent } from '../types';
import { CONTINENT_TRANSLATIONS } from '../i18n/translations';
import { soundService } from '../utils/soundHelper';

interface ContinentMasteryChartProps {
  continentProgress?: Record<string, { correct: number; total: number; stars: number }>;
  capitalsProgress?: Record<string, { correct: number; total: number; stars: number; bestScore?: number }>;
  style?: ViewStyle;
}

interface ContinentStatItem {
  continent: Continent;
  displayName: string;
  shortName: string;
  icon: keyof typeof Ionicons.glyphMap;
  emoji: string;
  color: string;
  gradient: [string, string];
  correct: number;
  total: number;
  accuracy: number;
  stars: number;
  masteryLevel: 'master' | 'expert' | 'advanced' | 'apprentice' | 'unexplored';
  masteryBadge: string;
  masteryTitle: string;
}

const CONTINENT_CONFIG: {
  continent: Continent;
  icon: keyof typeof Ionicons.glyphMap;
  emoji: string;
  color: string;
  gradient: [string, string];
  shortEs: string;
  shortEn: string;
}[] = [
  {
    continent: 'América',
    icon: 'earth',
    emoji: '🌎',
    color: '#FF9500',
    gradient: ['#FF9500', '#FF5E3A'],
    shortEs: 'Amér.',
    shortEn: 'Amer.',
  },
  {
    continent: 'Europa',
    icon: 'trail-sign',
    emoji: '🏰',
    color: '#007AFF',
    gradient: ['#007AFF', '#0A84FF'],
    shortEs: 'Euro.',
    shortEn: 'Euro.',
  },
  {
    continent: 'Asia',
    icon: 'sparkles',
    emoji: '⛩️',
    color: '#AF52DE',
    gradient: ['#AF52DE', '#8B5CF6'],
    shortEs: 'Asia',
    shortEn: 'Asia',
  },
  {
    continent: 'África',
    icon: 'sunny',
    emoji: '🌍',
    color: '#34C759',
    gradient: ['#34C759', '#30D158'],
    shortEs: 'Áfri.',
    shortEn: 'Afri.',
  },
  {
    continent: 'Oceanía',
    icon: 'water',
    emoji: '🏝️',
    color: '#FF2D55',
    gradient: ['#FF2D55', '#FF375F'],
    shortEs: 'Ocea.',
    shortEn: 'Ocea.',
  },
];

export const ContinentMasteryChart: React.FC<ContinentMasteryChartProps> = ({
  continentProgress = {},
  capitalsProgress = {},
  style,
}) => {
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();
  const [viewModeIndex, setViewModeIndex] = useState<number>(0); // 0 = Chart, 1 = Cards
  const [selectedContinent, setSelectedContinent] = useState<Continent | null>(null);

  // Animación de altura para las barras del gráfico
  const animValues = useRef<Record<Continent, Animated.Value>>({
    América: new Animated.Value(0),
    Europa: new Animated.Value(0),
    Asia: new Animated.Value(0),
    África: new Animated.Value(0),
    Oceanía: new Animated.Value(0),
  }).current;

  // Procesar datos para cada continente
  const continentStats: ContinentStatItem[] = CONTINENT_CONFIG.map((cfg) => {
    const flagProg = continentProgress[cfg.continent] || { correct: 0, total: 0, stars: 0 };
    const capProg = capitalsProgress[cfg.continent] || { correct: 0, total: 0, stars: 0 };

    const correct = (flagProg.correct || 0) + (capProg.correct || 0);
    const total = (flagProg.total || 0) + (capProg.total || 0);
    const stars = Math.max(flagProg.stars || 0, capProg.stars || 0);
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    let masteryLevel: ContinentStatItem['masteryLevel'] = 'unexplored';
    let masteryBadge = '🧭';
    let masteryTitle = t('profile_mastery_level_unexplored');

    if (total > 0) {
      if (accuracy >= 90) {
        masteryLevel = 'master';
        masteryBadge = '👑';
        masteryTitle = t('profile_mastery_level_master');
      } else if (accuracy >= 75) {
        masteryLevel = 'expert';
        masteryBadge = '🌟';
        masteryTitle = t('profile_mastery_level_expert');
      } else if (accuracy >= 50) {
        masteryLevel = 'advanced';
        masteryBadge = '⚡';
        masteryTitle = t('profile_mastery_level_advanced');
      } else {
        masteryLevel = 'apprentice';
        masteryBadge = '🌱';
        masteryTitle = t('profile_mastery_level_apprentice');
      }
    }

    const translatedName =
      CONTINENT_TRANSLATIONS[cfg.continent]?.[language === 'en' ? 'en' : 'es'] || cfg.continent;
    const shortName = language === 'en' ? cfg.shortEn : cfg.shortEs;

    return {
      continent: cfg.continent,
      displayName: translatedName,
      shortName,
      icon: cfg.icon,
      emoji: cfg.emoji,
      color: cfg.color,
      gradient: cfg.gradient,
      correct,
      total,
      accuracy,
      stars,
      masteryLevel,
      masteryBadge,
      masteryTitle,
    };
  });

  // Animar las barras cuando cambien los datos o la vista
  useEffect(() => {
    const animations = continentStats.map((item) => {
      // Normalizar altura: si total es 0, altura 0%. Si accuracy > 0, altura proporcional
      const targetValue = item.total > 0 ? Math.max(0.06, item.accuracy / 100) : 0;
      return Animated.spring(animValues[item.continent], {
        toValue: targetValue,
        useNativeDriver: false,
        speed: 12,
        bounciness: 4,
      });
    });

    Animated.stagger(60, animations).start();
  }, [continentProgress, capitalsProgress, viewModeIndex]);

  // Continente con mejor rendimiento (mínimo 1 jugada)
  const playedContinents = continentStats.filter((c) => c.total > 0);
  const topContinent =
    playedContinents.length > 0
      ? [...playedContinents].sort((a, b) => b.accuracy - a.accuracy || b.total - a.total)[0]
      : null;

  // Promedio global continental
  const totalCorrectAll = continentStats.reduce((acc, c) => acc + c.correct, 0);
  const totalQuestionsAll = continentStats.reduce((acc, c) => acc + c.total, 0);
  const averageAccuracy =
    totalQuestionsAll > 0 ? Math.round((totalCorrectAll / totalQuestionsAll) * 100) : 0;

  // Continente actualmente seleccionado para detalle en gráfico
  const activeDetail =
    continentStats.find((c) => c.continent === selectedContinent) ||
    (topContinent ?? continentStats[0]);

  const handleSelectBar = (continent: Continent) => {
    soundService.triggerLightTap();
    setSelectedContinent((prev) => (prev === continent ? null : continent));
  };

  const CHART_HEIGHT = 130;

  return (
    <View style={[styles.container, style]}>
      {/* Encabezado con selector de vista */}
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Text style={[styles.sectionTitle, { color: colors.label }]}>
            {t('profile_continent_mastery_title')}
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.secondaryLabel }]}>
            {t('profile_continent_mastery_subtitle')}
          </Text>
        </View>

        <SegmentedControl
          values={[t('profile_mastery_view_chart'), t('profile_mastery_view_cards')]}
          selectedIndex={viewModeIndex}
          onChange={(index) => {
            soundService.triggerSelection();
            setViewModeIndex(index);
          }}
          style={styles.segmentedControl}
        />
      </View>

      {/* Tarjeta Principal de Análisis */}
      <AppleCard style={styles.mainCard} shadowLevel="small">
        {/* Métricas destacadas: Mejor continente y Acierto Promedio */}
        <View style={[styles.summaryBanner, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.secondaryLabel }]}>
              {t('profile_mastery_top_continent')}
            </Text>
            {topContinent ? (
              <View style={styles.topContinentBadge}>
                <Text style={styles.topContinentEmoji}>{topContinent.emoji}</Text>
                <Text style={[styles.topContinentName, { color: topContinent.color }]}>
                  {topContinent.displayName}
                </Text>
                <View style={[styles.topContinentAccuracyPill, { backgroundColor: `${topContinent.color}22` }]}>
                  <Text style={[styles.topContinentAccuracyText, { color: topContinent.color }]}>
                    {topContinent.accuracy}%
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={[styles.summaryEmpty, { color: colors.secondaryLabel }]}>
                {t('profile_mastery_no_data')}
              </Text>
            )}
          </View>

          <View style={[styles.summaryDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />

          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.secondaryLabel }]}>
              {t('profile_mastery_accuracy')}
            </Text>
            <View style={styles.averageAccuracyRow}>
              <Text style={[styles.averageAccuracyVal, { color: colors.label }]}>
                {totalQuestionsAll > 0 ? `${averageAccuracy}%` : '—'}
              </Text>
              {totalQuestionsAll > 0 && (
                <Text style={[styles.averageAccuracySub, { color: colors.secondaryLabel }]}>
                  ({totalCorrectAll}/{totalQuestionsAll})
                </Text>
              )}
            </View>
          </View>
        </View>

        {viewModeIndex === 0 ? (
          /* ================= VISTA DE GRÁFICA DE BARRAS ================= */
          <View style={styles.chartWrapper}>
            {/* Contenedor del gráfico con líneas de referencia */}
            <View style={[styles.chartArea, { height: CHART_HEIGHT }]}>
              {/* Líneas guía horizontales (100%, 75%, 50%, 25%) */}
              <View style={[styles.gridLine, { bottom: '100%', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />
              <View style={[styles.gridLine, { bottom: '75%', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]} />
              <View style={[styles.gridLine, { bottom: '50%', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]} />
              <View style={[styles.gridLine, { bottom: '25%', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]} />
              <View style={[styles.baseline, { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }]} />

              {/* Columnas de Barras */}
              <View style={styles.barsContainer}>
                {continentStats.map((item) => {
                  const isSelected = selectedContinent === item.continent;
                  const barHeightInterpolated = animValues[item.continent].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, CHART_HEIGHT],
                  });

                  return (
                    <Pressable
                      key={item.continent}
                      onPress={() => handleSelectBar(item.continent)}
                      style={styles.barColumn}
                    >
                      {/* Porcentaje arriba de la barra */}
                      <View style={styles.percentHeader}>
                        <Text
                          style={[
                            styles.barPercentText,
                            {
                              color: item.total > 0 ? item.color : colors.secondaryLabel,
                              fontWeight: isSelected ? '700' : '600',
                            },
                          ]}
                        >
                          {item.total > 0 ? `${item.accuracy}%` : '—'}
                        </Text>
                      </View>

                      {/* Track de la barra */}
                      <View
                        style={[
                          styles.barTrack,
                          {
                            height: CHART_HEIGHT,
                            backgroundColor: isDark
                              ? isSelected
                                ? 'rgba(255,255,255,0.12)'
                                : 'rgba(255,255,255,0.06)'
                              : isSelected
                              ? 'rgba(0,0,0,0.08)'
                              : 'rgba(0,0,0,0.04)',
                            borderColor: isSelected ? item.color : 'transparent',
                            borderWidth: isSelected ? 1.5 : 0,
                          },
                        ]}
                      >
                        {/* Relleno con gradiente */}
                        <Animated.View
                          style={[
                            styles.barFill,
                            {
                              height: barHeightInterpolated,
                            },
                          ]}
                        >
                          <LinearGradient
                            colors={item.gradient}
                            start={{ x: 0, y: 1 }}
                            end={{ x: 0, y: 0 }}
                            style={StyleSheet.absoluteFill}
                          />
                        </Animated.View>
                      </View>

                      {/* Icono y Nombre del continente abajo */}
                      <View style={styles.barFooter}>
                        <View
                          style={[
                            styles.continentIconPill,
                            {
                              backgroundColor: `${item.color}1E`,
                              borderColor: isSelected ? item.color : 'transparent',
                              borderWidth: isSelected ? 1 : 0,
                            },
                          ]}
                        >
                          <Text style={styles.continentEmojiSmall}>{item.emoji}</Text>
                        </View>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.barContinentLabel,
                            {
                              color: isSelected ? colors.label : colors.secondaryLabel,
                              fontWeight: isSelected ? '700' : '500',
                            },
                          ]}
                        >
                          {item.shortName}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Tarjeta de Detalle del Continente Seleccionado en Gráfico */}
            {activeDetail && (
              <View
                style={[
                  styles.activeDetailCard,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                    borderColor: `${activeDetail.color}40`,
                  },
                ]}
              >
                <View style={styles.activeDetailHeader}>
                  <View style={styles.activeDetailLeft}>
                    <Text style={styles.activeDetailEmoji}>{activeDetail.emoji}</Text>
                    <View>
                      <Text style={[styles.activeDetailTitle, { color: colors.label }]}>
                        {activeDetail.displayName}
                      </Text>
                      <Text style={[styles.activeDetailSub, { color: colors.secondaryLabel }]}>
                        {activeDetail.total > 0
                          ? t('profile_mastery_answered_ratio')
                              .replace('{correct}', String(activeDetail.correct))
                              .replace('{total}', String(activeDetail.total))
                          : t('profile_mastery_no_data')}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.masteryBadgePill, { backgroundColor: `${activeDetail.color}20` }]}>
                    <Text style={styles.masteryBadgeEmoji}>{activeDetail.masteryBadge}</Text>
                    <Text style={[styles.masteryBadgeText, { color: activeDetail.color }]}>
                      {activeDetail.masteryTitle}
                    </Text>
                  </View>
                </View>

                {activeDetail.total > 0 && (
                  <View style={styles.activeDetailProgressRow}>
                    <ProgressBar
                      progress={activeDetail.accuracy / 100}
                      height={6}
                      gradientColors={activeDetail.gradient}
                      style={{ flex: 1, marginRight: 10 }}
                    />
                    <Text style={[styles.activeDetailPercent, { color: activeDetail.color }]}>
                      {activeDetail.accuracy}%
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        ) : (
          /* ================= VISTA DE TARJETAS DETALLADAS ================= */
          <View style={styles.cardsWrapper}>
            {continentStats.map((item) => (
              <View
                key={item.continent}
                style={[
                  styles.continentDetailCard,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  },
                ]}
              >
                {/* Cabecera de la tarjeta: Icono + Nombre + Badge de Maestría */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardTitleGroup}>
                    <View style={[styles.cardIconBox, { backgroundColor: `${item.color}20` }]}>
                      <Text style={styles.cardEmoji}>{item.emoji}</Text>
                    </View>
                    <View>
                      <Text style={[styles.cardContinentName, { color: colors.label }]}>
                        {item.displayName}
                      </Text>
                      <Text style={[styles.cardRatioText, { color: colors.secondaryLabel }]}>
                        {item.total > 0
                          ? t('profile_mastery_answered_ratio')
                              .replace('{correct}', String(item.correct))
                              .replace('{total}', String(item.total))
                          : t('profile_mastery_no_data')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardAccuracyGroup}>
                    <Text style={[styles.cardAccuracyVal, { color: item.total > 0 ? item.color : colors.secondaryLabel }]}>
                      {item.total > 0 ? `${item.accuracy}%` : '0%'}
                    </Text>
                    <View style={[styles.cardMasteryPill, { backgroundColor: `${item.color}18` }]}>
                      <Text style={styles.cardMasteryEmoji}>{item.masteryBadge}</Text>
                      <Text style={[styles.cardMasteryText, { color: item.color }]}>
                        {item.masteryTitle}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Barra de Progreso Continental */}
                <View style={styles.cardProgressWrapper}>
                  <ProgressBar
                    progress={item.total > 0 ? item.accuracy / 100 : 0}
                    height={8}
                    gradientColors={item.gradient}
                  />
                </View>

                {/* Estrellas acumuladas en este continente */}
                {item.stars > 0 && (
                  <View style={styles.cardStarsRow}>
                    <View style={styles.starsWrapper}>
                      {[1, 2, 3].map((starIndex) => (
                        <Ionicons
                          key={starIndex}
                          name={starIndex <= item.stars ? 'star' : 'star-outline'}
                          size={14}
                          color={starIndex <= item.stars ? '#FFD60A' : colors.secondaryLabel}
                          style={{ marginRight: 2 }}
                        />
                      ))}
                    </View>
                    <Text style={[styles.starsLabel, { color: colors.secondaryLabel }]}>
                      {t('profile_mastery_stars_earned')}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </AppleCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleContainer: {
    flex: 1,
    paddingRight: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  segmentedControl: {
    width: 140,
  },
  mainCard: {
    padding: 16,
    borderRadius: 20,
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 18,
  },
  summaryItem: {
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    height: 36,
    marginHorizontal: 12,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  summaryEmpty: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  topContinentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topContinentEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  topContinentName: {
    fontSize: 14,
    fontWeight: '700',
    marginRight: 6,
  },
  topContinentAccuracyPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  topContinentAccuracyText: {
    fontSize: 11,
    fontWeight: '700',
  },
  averageAccuracyRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  averageAccuracyVal: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginRight: 6,
  },
  averageAccuracySub: {
    fontSize: 11,
    fontWeight: '500',
  },
  chartWrapper: {
    marginTop: 6,
  },
  chartArea: {
    width: '100%',
    position: 'relative',
    marginBottom: 20,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
  },
  baseline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderBottomWidth: 1.5,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: '100%',
    paddingHorizontal: 6,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  percentHeader: {
    height: 18,
    justifyContent: 'center',
    marginBottom: 6,
  },
  barPercentText: {
    fontSize: 11,
    letterSpacing: -0.2,
  },
  barTrack: {
    width: 28,
    borderRadius: 14,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    overflow: 'hidden',
  },
  barFooter: {
    alignItems: 'center',
    marginTop: 8,
  },
  continentIconPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  continentEmojiSmall: {
    fontSize: 12,
  },
  barContinentLabel: {
    fontSize: 11,
    letterSpacing: -0.2,
  },
  activeDetailCard: {
    marginTop: 6,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  activeDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeDetailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activeDetailEmoji: {
    fontSize: 22,
    marginRight: 10,
  },
  activeDetailTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  activeDetailSub: {
    fontSize: 11,
    marginTop: 2,
  },
  masteryBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  masteryBadgeEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  masteryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  activeDetailProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  activeDetailPercent: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardsWrapper: {
    gap: 10,
  },
  continentDetailCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardEmoji: {
    fontSize: 18,
  },
  cardContinentName: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  cardRatioText: {
    fontSize: 11,
    marginTop: 2,
  },
  cardAccuracyGroup: {
    alignItems: 'flex-end',
  },
  cardAccuracyVal: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  cardMasteryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
  },
  cardMasteryEmoji: {
    fontSize: 10,
    marginRight: 3,
  },
  cardMasteryText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardProgressWrapper: {
    marginTop: 10,
  },
  cardStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.15)',
  },
  starsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
});
