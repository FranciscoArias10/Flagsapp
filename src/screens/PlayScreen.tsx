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
import { QuizGameScreen } from './QuizGameScreen';
import { BlitzGameScreen } from './BlitzGameScreen';

export const PlayScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) : 0);
  const { stats } = useGame();
  const levelInfo = getLevelInfo(stats.xp);

  const [activeQuizContinent, setActiveQuizContinent] = useState<Continent | 'Mundo' | null>(null);
  const [showBlitzModal, setShowBlitzModal] = useState(false);
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<number | 'all'>(10);

  const handleStartQuiz = (continent: Continent | 'Mundo') => {
    soundService.triggerLightTap();
    setActiveQuizContinent(continent);
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
    <View style={[styles.container, { paddingTop: topInset }]}>
      <AppleHeader
        title="Flags++"
        category="TRIVIA & GEOGRAFÍA"
        showLogo
        rightAccessory={
          <View style={styles.headerRight}>
            <StreakBadge streak={stats.streak} size="small" />
            <View style={styles.xpPill}>
              <Ionicons name="sparkles" size={13} color={IOSColors.systemPurple} />
              <Text style={styles.xpPillText}>{stats.xp} XP</Text>
            </View>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* User Mini Progress Strip */}
        <AppleCard style={styles.userStrip} shadowLevel="small">
          <View style={styles.userStripRow}>
            <View style={styles.userAvatarWrap}>
              <Text style={styles.userAvatarEmoji}>{stats.avatar || '🧭'}</Text>
            </View>
            <View style={styles.userStripMeta}>
              <Text style={styles.userGreeting}>¡Hola, {stats.username || 'Explorador'}!</Text>
              <Text style={styles.userStripLevel}>Nivel {levelInfo.level} • {levelInfo.title}</Text>
              <Text style={styles.userStripSub}>
                {levelInfo.xpToNext > 0 ? `${levelInfo.xpToNext} XP para subir de nivel` : '¡Nivel Legendario!'}
              </Text>
            </View>
            <View style={styles.userStripBadge}>
              <Ionicons name="shield-checkmark" size={24} color={IOSColors.systemBlue} />
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
                <Text style={styles.heroBadgeText}>CONTRARRELOJ • 5S, 10S O 15S</Text>
              </View>
              <Text style={styles.heroTitle}>Desafío Blitz ⚡</Text>
              <Text style={styles.heroSubtitle}>
                Elige tu dificultad: 15s, 10s o extremo 5s. ¡Reflejos al límite!
              </Text>

              <View style={styles.heroBtn}>
                <Text style={styles.heroBtnText}>Jugar Blitz</Text>
                <Ionicons name="arrow-forward" size={16} color="#FF3B30" />
              </View>
            </View>
          </LinearGradient>
        </Pressable>

        {/* Question Count Selection Strip */}
        <View style={styles.countSelectorHeader}>
          <Text style={styles.sectionTitle}>PREGUNTAS POR RONDA</Text>
          <Text style={styles.countSelectedSub}>
            {selectedQuestionCount === 'all' ? 'Todo el Catálogo' : `${selectedQuestionCount} Preguntas`}
          </Text>
        </View>
        <View style={styles.countSelectorRow}>
          {([10, 20, 50, 'all'] as const).map((cnt) => {
            const isSelected = selectedQuestionCount === cnt;
            const label = cnt === 'all' ? 'Todas' : `${cnt}`;
            return (
              <Pressable
                key={String(cnt)}
                onPress={() => {
                  soundService.triggerSelection();
                  setSelectedQuestionCount(cnt);
                }}
                style={[
                  styles.countChip,
                  isSelected && styles.countChipActive,
                ]}
              >
                <Text style={[styles.countChipText, isSelected && styles.countChipTextActive]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Global Explorer Mode Card */}
        <Text style={styles.sectionTitle}>MODO GLOBAL</Text>
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
                <Text style={styles.globalTitle}>Todo el Mundo</Text>
                <Text style={styles.globalSubtitle}>Todos los continentes combinados</Text>
              </View>
            </View>
            <View style={styles.globalFooter}>
              <Text style={styles.globalQuestionCount}>
                {selectedQuestionCount === 'all' ? '126 Preguntas (Catálogo Completo)' : `${selectedQuestionCount} Preguntas Variadas`}
              </Text>
              <Ionicons name="play-circle" size={32} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </Pressable>

        {/* Continents Grid */}
        <Text style={styles.sectionTitle}>NIVELES POR CONTINENTE</Text>
        <View style={styles.continentsGrid}>
          {CONTINENTS.map((item) => {
            const prog = stats.continentProgress[item.name] || { correct: 0, total: 0, stars: 0 };
            return (
              <Pressable
                key={item.name}
                onPress={() => handleStartQuiz(item.name)}
                style={({ pressed }) => [
                  styles.continentCard,
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

                <Text style={styles.continentName}>{item.name}</Text>
                <Text style={styles.continentCount}>{item.count} Países</Text>

                <View style={styles.continentFooter}>
                  <Text style={[styles.continentPlayTxt, { color: item.color }]}>
                    Jugar
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={item.color} />
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

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
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  globalQuestionCount: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
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
    padding: 16,
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
    marginBottom: 12,
  },
  continentIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  continentName: {
    fontSize: 17,
    fontWeight: '700',
    color: IOSColors.label,
    marginBottom: 2,
  },
  continentCount: {
    fontSize: 12,
    color: IOSColors.secondaryLabel,
    marginBottom: 12,
  },
  continentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  continentPlayTxt: {
    fontSize: 13,
    fontWeight: '700',
    marginRight: 2,
  },
  countSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 8,
  },
  countSelectedSub: {
    fontSize: 12,
    fontWeight: '700',
    color: IOSColors.systemBlue,
  },
  countSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  countChip: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    ...IOSColors.cardShadow,
  },
  countChipActive: {
    backgroundColor: IOSColors.systemBlue,
    borderColor: IOSColors.systemBlue,
  },
  countChipText: {
    fontSize: 13,
    fontWeight: '800',
    color: IOSColors.label,
  },
  countChipTextActive: {
    color: '#FFFFFF',
  },
});
