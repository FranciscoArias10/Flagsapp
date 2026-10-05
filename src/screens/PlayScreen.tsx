import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Continent } from '../types';
import { CONTINENTS } from '../data/countries';
import { IOSColors } from '../utils/colors';
import { soundService } from '../utils/soundHelper';
import { useGame, getLevelInfo } from '../context/GameContext';
import { AppleHeader } from '../components/AppleHeader';
import { AppleCard } from '../components/AppleCard';
import { StreakBadge } from '../components/StreakBadge';
import { ProgressBar } from '../components/ProgressBar';
import { GameStartModal } from '../components/GameStartModal';
import { QuizGameScreen } from './QuizGameScreen';
import { BlitzGameScreen } from './BlitzGameScreen';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

export const PlayScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) : 0);
  const { stats } = useGame();
  const { isDark, colors } = useTheme();
  const { t, getContinentName } = useLanguage();
  const levelInfo = getLevelInfo(stats.xp);

  const [activeQuizContinent, setActiveQuizContinent] = useState<Continent | 'Mundo' | null>(null);
  const [showBlitzModal, setShowBlitzModal] = useState(false);
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<number | 'all'>(10);
  const [activeQuizTimeLimit, setActiveQuizTimeLimit] = useState<number>(15);

  const [selectedQuizTarget, setSelectedQuizTarget] = useState<{
    continent: Continent | 'Mundo';
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    gradient: [string, string];
    totalCount: number;
  } | null>(null);

  const handleStartQuiz = (continent: Continent | 'Mundo') => {
    soundService.triggerLightTap();
    if (continent === 'Mundo') {
      setSelectedQuizTarget({
        continent: 'Mundo',
        title: t('play_global_title_card'),
        subtitle: t('play_all_continents_combined'),
        icon: 'earth',
        color: '#007AFF',
        gradient: ['#007AFF', '#5856D6'],
        totalCount: 126,
      });
    } else {
      const found = CONTINENTS.find((c) => c.name === continent);
      const localizedContinent = getContinentName(continent);
      setSelectedQuizTarget({
        continent,
        title: localizedContinent,
        subtitle: `${found?.count || 0} ${t('play_continents_count_label', { count: '' }).trim()} • ${localizedContinent}`,
        icon: (found?.icon as any) || 'globe-outline',
        color: found?.color || '#007AFF',
        gradient: [found?.color || '#007AFF', '#5856D6'],
        totalCount: found?.count || 50,
      });
    }
  };

  const handleStartBlitz = () => {
    soundService.triggerMediumTap();
    setShowBlitzModal(true);
  };

  const renderStars = (stars: number = 0) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3].map((s) => (
          <Ionicons
            key={s}
            name="star"
            size={14}
            color={stars >= s ? IOSColors.goldStar : 'rgba(120, 120, 128, 0.2)'}
            style={{ marginRight: 2 }}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.systemBackground, paddingTop: topInset }]}>
      <AppleHeader
        title="Flags++"
        category={t('play_header_category')}
        showLogo
        rightAccessory={
          <View style={styles.headerRight}>
            <StreakBadge streak={stats.streak} size="small" />
            <View style={styles.xpPill}>
              <Ionicons name="sparkles" size={13} color={colors.systemPurple} />
              <Text style={[styles.xpPillText, { color: colors.systemPurple }]}>{stats.xp} XP</Text>
            </View>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 130 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* User Mini Progress Strip */}
        <AppleCard style={styles.userStrip} shadowLevel="small">
          <View style={styles.userStripRow}>
            <View style={styles.userAvatarWrap}>
              <Text style={styles.userAvatarEmoji}>{stats.avatar || '🧭'}</Text>
            </View>
            <View style={styles.userStripMeta}>
              <Text style={[styles.userGreeting, { color: colors.label }]} numberOfLines={1}>
                {t('play_greeting', { name: stats.username || t('play_default_user') })}
              </Text>
              <Text style={[styles.userStripLevel, { color: colors.systemPurple }]} numberOfLines={1}>
                {t('play_level_prefix')} {levelInfo.level} • {levelInfo.title}
              </Text>
              <Text style={[styles.userStripSub, { color: colors.secondaryLabel }]} numberOfLines={1}>
                {levelInfo.xpToNext > 0
                  ? t('play_xp_to_next', { xp: levelInfo.xpToNext })
                  : t('play_legendary_level')}
              </Text>
            </View>
            <View style={styles.userStripBadge}>
              <Ionicons name="shield-checkmark" size={24} color={colors.systemBlue} />
            </View>
          </View>
          <ProgressBar progress={levelInfo.progress} height={6} style={{ marginTop: 10 }} />
        </AppleCard>

        {/* Hero Card: Desafío Blitz */}
        <Pressable
          onPress={handleStartBlitz}
          style={({ pressed }) => [styles.blitzHero, pressed && { opacity: 0.94 }]}
        >
          <LinearGradient
            colors={['#FF3B30', '#FF9500']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroBadge}>
                <Ionicons name="flash" size={12} color="#FFFFFF" />
                <Text style={styles.heroBadgeText}>{t('play_blitz_badge')}</Text>
              </View>
              <Text style={styles.heroTitle}>{t('play_blitz_title')}</Text>
              <Text style={styles.heroSubtitle}>{t('play_blitz_subtitle')}</Text>

              <View style={styles.heroBtn}>
                <Text style={styles.heroBtnText}>{t('play_blitz_btn')}</Text>
                <Ionicons name="arrow-forward" size={16} color="#FF3B30" />
              </View>
            </View>
          </LinearGradient>
        </Pressable>

        {/* Global Explorer Mode Card */}
        <Text style={styles.sectionTitle}>{t('play_global_section')}</Text>
        <Pressable
          onPress={() => handleStartQuiz('Mundo')}
          style={({ pressed }) => [styles.globalCard, pressed && { opacity: 0.94 }]}
        >
          <LinearGradient
            colors={['#007AFF', '#5856D6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.globalGradient}
          >
            <View style={styles.globalHeader}>
              <View style={styles.globalIconCircle}>
                <Ionicons name="earth" size={28} color="#FFFFFF" />
              </View>
              <View style={styles.globalMeta}>
                <Text style={styles.globalTitle}>{t('play_global_title_card')}</Text>
                <Text style={styles.globalSubtitle}>{t('play_global_subtitle_card')}</Text>
              </View>
            </View>
            <View style={styles.globalFooter}>
              <View style={styles.globalFooterLeft}>
                <Text style={styles.globalQuestionCount} numberOfLines={1}>
                  {t('play_global_count_label')}
                </Text>
              </View>
              <View style={styles.globalPlayBtn}>
                <Text style={styles.globalPlayBtnText}>{t('play_btn_play')}</Text>
                <Ionicons name="play" size={13} color="#007AFF" />
              </View>
            </View>
          </LinearGradient>
        </Pressable>

        {/* Continents Grid */}
        <Text style={[styles.sectionTitle, { color: colors.secondaryLabel }]}>
          {t('play_continents_section')}
        </Text>
        <View style={styles.continentsGrid}>
          {CONTINENTS.map((item) => {
            const prog = stats.continentProgress[item.name] || { correct: 0, total: 0, stars: 0 };
            const localizedContinent = getContinentName(item.name);
            return (
              <Pressable
                key={item.name}
                onPress={() => handleStartQuiz(item.name)}
                style={({ pressed }) => [
                  styles.continentCard,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.cardBorder,
                    borderWidth: 1,
                  },
                  colors.cardShadow,
                  pressed && styles.cardPressed,
                ]}
              >
                <View style={styles.continentTopRow}>
                  <View
                    style={[
                      styles.continentIconWrap,
                      { backgroundColor: `${item.color}15` },
                    ]}
                  >
                    <Ionicons name={item.icon as any} size={22} color={item.color} />
                  </View>
                  {renderStars(prog.stars)}
                </View>

                <Text style={[styles.continentName, { color: colors.label }]}>{localizedContinent}</Text>
                <Text style={[styles.continentCount, { color: colors.secondaryLabel }]}>
                  {t('play_continents_count_label', { count: item.count })}
                </Text>

                <View style={styles.continentFooter}>
                  <View style={[styles.continentPlayBadge, { backgroundColor: `${item.color}15` }]}>
                    <Text style={[styles.continentPlayTxt, { color: item.color }]}>
                      {t('play_btn_play')}
                    </Text>
                    <Ionicons name="play" size={11} color={item.color} />
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={colors.tertiaryLabel} />
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Game Start Settings Modal (Questions & Time per mode) */}
      {selectedQuizTarget && (
        <GameStartModal
          visible={selectedQuizTarget !== null}
          onClose={() => setSelectedQuizTarget(null)}
          onStart={(count, timeLimit) => {
            setSelectedQuestionCount(count);
            setActiveQuizTimeLimit(timeLimit);
            const targetContinent = selectedQuizTarget.continent;
            setSelectedQuizTarget(null);
            setActiveQuizContinent(targetContinent);
          }}
          title={selectedQuizTarget.title}
          subtitle={selectedQuizTarget.subtitle}
          icon={selectedQuizTarget.icon}
          color={selectedQuizTarget.color}
          gradient={selectedQuizTarget.gradient}
          initialCount={selectedQuestionCount}
          initialTime={activeQuizTimeLimit}
          showTimeSelector={true}
          totalAvailable={selectedQuizTarget.totalCount}
        />
      )}

      {/* Main Quiz Game Modal */}
      <Modal
        visible={activeQuizContinent !== null}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setActiveQuizContinent(null)}
      >
        {activeQuizContinent && (
          <QuizGameScreen
            continent={activeQuizContinent}
            initialQuestionCount={selectedQuestionCount}
            initialTimeLimit={activeQuizTimeLimit}
            onClose={() => setActiveQuizContinent(null)}
          />
        )}
      </Modal>

      {/* Blitz Game Modal */}
      <Modal
        visible={showBlitzModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowBlitzModal(false)}
      >
        <BlitzGameScreen onClose={() => setShowBlitzModal(false)} />
      </Modal>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  userStrip: {
    marginTop: 8,
    marginBottom: 20,
    padding: 16,
  },
  userStripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  userAvatarEmoji: {
    fontSize: 28,
  },
  userStripMeta: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  userGreeting: {
    fontSize: 16,
    fontWeight: '800',
    color: IOSColors.label,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  userStripLevel: {
    fontSize: 13,
    fontWeight: '600',
    color: IOSColors.systemPurple,
    marginBottom: 2,
  },
  userStripSub: {
    fontSize: 12,
    color: IOSColors.secondaryLabel,
  },
  userStripBadge: {
    marginLeft: 12,
  },
  blitzHero: {
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 24,
    ...IOSColors.cardShadowLarge,
  },
  heroGradient: {
    padding: 20,
  },
  heroContent: {},
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
    marginBottom: 16,
  },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignSelf: 'flex-start',
    ...IOSColors.cardShadow,
  },
  heroBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF3B30',
    marginRight: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: IOSColors.secondaryLabel,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },
  globalCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    ...IOSColors.cardShadow,
  },
  globalGradient: {
    padding: 18,
  },
  globalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  globalIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  globalMeta: {
    flex: 1,
  },
  globalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  globalSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  globalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.18)',
  },
  globalFooterLeft: {
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },
  globalQuestionCount: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.95)',
  },
  globalPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 12,
    ...IOSColors.cardShadow,
  },
  globalPlayBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#007AFF',
    marginRight: 4,
  },
  continentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  continentCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    ...IOSColors.cardShadow,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  continentTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  continentIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  continentName: {
    fontSize: 16,
    fontWeight: '700',
    color: IOSColors.label,
    marginBottom: 2,
  },
  continentCount: {
    fontSize: 12,
    color: IOSColors.secondaryLabel,
    marginBottom: 10,
  },
  continentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  continentPlayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 10,
  },
  continentPlayTxt: {
    fontSize: 12,
    fontWeight: '800',
    marginRight: 3,
  },
});
