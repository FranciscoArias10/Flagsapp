import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useGame, getLevelInfo } from '../context/GameContext';
import { IOSColors } from '../utils/colors';
import { soundService } from '../utils/soundHelper';
import { AppleHeader } from '../components/AppleHeader';
import { AppleCard } from '../components/AppleCard';
import { ProgressBar } from '../components/ProgressBar';
import { AppleButton } from '../components/AppleButton';

export const ProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) : 0);
  const { stats, achievements, toggleSound, toggleHaptics, resetProgress } = useGame();

  const levelInfo = getLevelInfo(stats.xp);
  const accuracy = stats.totalAnswers > 0
    ? Math.round((stats.correctAnswers / stats.totalAnswers) * 100)
    : 0;

  const handleReset = () => {
    soundService.triggerHeavyTap();
    Alert.alert(
      'Reiniciar Progreso',
      '¿Estás seguro de que deseas reiniciar todos tus puntos de experiencia, rachas y logros desbloqueados?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reiniciar',
          style: 'destructive',
          onPress: async () => {
            await resetProgress();
            soundService.triggerLightTap();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <AppleHeader title="Perfil" category="JUGADOR" />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <AppleCard style={styles.profileCard} shadowLevel="large">
          <View style={styles.avatarRow}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={36} color="#FFFFFF" />
            </View>
            <View style={styles.playerMeta}>
              <Text style={styles.playerTitle}>{levelInfo.title}</Text>
              <View style={styles.levelBadge}>
                <Ionicons name="sparkles" size={13} color={IOSColors.systemPurple} />
                <Text style={styles.levelBadgeText}>Nivel {levelInfo.level}</Text>
              </View>
            </View>
          </View>

          {/* XP Progress */}
          <View style={styles.xpSection}>
            <View style={styles.xpLabelRow}>
              <Text style={styles.xpText}>{stats.xp} XP acumulados</Text>
              <Text style={styles.xpNextText}>
                {levelInfo.xpToNext > 0 ? `${levelInfo.xpToNext} XP para el sig. nivel` : '¡Nivel Máximo!'}
              </Text>
            </View>
            <ProgressBar
              progress={levelInfo.progress}
              height={10}
              gradientColors={['#007AFF', '#AF52DE']}
            />
          </View>
        </AppleCard>

        {/* Global Statistics */}
        <Text style={styles.sectionHeader}>ESTADÍSTICAS</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Ionicons name="game-controller" size={24} color={IOSColors.systemBlue} />
            <Text style={styles.statVal}>{stats.gamesPlayed}</Text>
            <Text style={styles.statLbl}>Partidas</Text>
          </View>

          <View style={styles.statBox}>
            <Ionicons name="flame" size={24} color={IOSColors.systemOrange} />
            <Text style={[styles.statVal, { color: IOSColors.systemOrange }]}>{stats.bestStreak}</Text>
            <Text style={styles.statLbl}>Mejor Racha</Text>
          </View>

          <View style={styles.statBox}>
            <Ionicons name="checkmark-done-circle" size={24} color={IOSColors.systemGreen} />
            <Text style={styles.statVal}>{stats.correctAnswers}</Text>
            <Text style={styles.statLbl}>Banderas Acertadas</Text>
          </View>

          <View style={styles.statBox}>
            <Ionicons name="pie-chart" size={24} color={IOSColors.systemPurple} />
            <Text style={[styles.statVal, { color: IOSColors.systemPurple }]}>{accuracy}%</Text>
            <Text style={styles.statLbl}>Precisión Global</Text>
          </View>
        </View>

        {/* Achievements Section */}
        <Text style={styles.sectionHeader}>LOGROS Y MEDALLAS</Text>
        <View style={styles.achievementsList}>
          {achievements.map((ach) => (
            <AppleCard key={ach.id} style={styles.achievementCard}>
              <View
                style={[
                  styles.achievementIconCircle,
                  { backgroundColor: ach.unlocked ? `${ach.color}25` : 'rgba(120, 120, 128, 0.1)' },
                ]}
              >
                <Ionicons
                  name={ach.icon as any}
                  size={24}
                  color={ach.unlocked ? ach.color : IOSColors.quaternaryLabel}
                />
              </View>

              <View style={styles.achievementMeta}>
                <View style={styles.achievementTitleRow}>
                  <Text
                    style={[
                      styles.achievementTitle,
                      !ach.unlocked && styles.achievementTitleLocked,
                    ]}
                  >
                    {ach.title}
                  </Text>
                  {ach.unlocked && (
                    <Ionicons name="checkmark-circle" size={18} color={IOSColors.systemGreen} />
                  )}
                </View>
                <Text style={styles.achievementDesc}>{ach.description}</Text>
              </View>
            </AppleCard>
          ))}
        </View>

        {/* Settings */}
        <Text style={styles.sectionHeader}>AJUSTES DE LA APLICACIÓN</Text>
        <AppleCard style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingLabelWrap}>
              <Ionicons name="volume-high" size={22} color={IOSColors.systemBlue} style={{ marginRight: 12 }} />
              <Text style={styles.settingTitle}>Efectos de Sonido</Text>
            </View>
            <Switch
              value={stats.soundEnabled}
              onValueChange={toggleSound}
              trackColor={{ false: '#E5E5EA', true: IOSColors.systemGreen }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingLabelWrap}>
              <Ionicons name="hardware-chip" size={22} color={IOSColors.systemPurple} style={{ marginRight: 12 }} />
              <Text style={styles.settingTitle}>Vibración Háptica (iOS)</Text>
            </View>
            <Switch
              value={stats.hapticsEnabled}
              onValueChange={toggleHaptics}
              trackColor={{ false: '#E5E5EA', true: IOSColors.systemGreen }}
            />
          </View>
        </AppleCard>

        <View style={styles.resetContainer}>
          <AppleButton
            title="Reiniciar Progreso"
            onPress={handleReset}
            variant="danger"
            size="medium"
          />
        </View>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  profileCard: {
    marginTop: 8,
    marginBottom: 24,
    padding: 20,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: IOSColors.systemBlue,
    alignItems: 'center',
    justifyContent: 'center',
    ...IOSColors.buttonShadow,
  },
  playerMeta: {
    marginLeft: 16,
    flex: 1,
  },
  playerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: IOSColors.label,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(175, 82, 222, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: IOSColors.systemPurple,
    marginLeft: 4,
  },
  xpSection: {
    marginTop: 4,
  },
  xpLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  xpText: {
    fontSize: 13,
    fontWeight: '700',
    color: IOSColors.label,
  },
  xpNextText: {
    fontSize: 12,
    color: IOSColors.secondaryLabel,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: IOSColors.secondaryLabel,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    ...IOSColors.cardShadow,
  },
  statVal: {
    fontSize: 24,
    fontWeight: '800',
    color: IOSColors.label,
    marginTop: 8,
    marginBottom: 2,
  },
  statLbl: {
    fontSize: 12,
    color: IOSColors.secondaryLabel,
    fontWeight: '500',
  },
  achievementsList: {
    gap: 10,
    marginBottom: 24,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  achievementIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  achievementMeta: {
    flex: 1,
  },
  achievementTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  achievementTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: IOSColors.label,
  },
  achievementTitleLocked: {
    color: IOSColors.tertiaryLabel,
  },
  achievementDesc: {
    fontSize: 12,
    color: IOSColors.secondaryLabel,
    lineHeight: 16,
  },
  settingsCard: {
    paddingVertical: 4,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: IOSColors.label,
  },
  divider: {
    height: 0.5,
    backgroundColor: IOSColors.separator,
    marginLeft: 34,
  },
  resetContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
});
