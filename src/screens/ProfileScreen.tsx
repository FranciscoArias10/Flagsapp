import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Modal,
  TextInput,
  Pressable,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useGame, getLevelInfo } from '../context/GameContext';
import { COUNTRIES } from '../data/countries';
import { IOSColors } from '../utils/colors';
import { soundService } from '../utils/soundHelper';
import { AppleHeader } from '../components/AppleHeader';
import { AppleCard } from '../components/AppleCard';
import { ProgressBar } from '../components/ProgressBar';
import { AppleButton } from '../components/AppleButton';

const AVATARS = ['🧭', '🦁', '🚀', '🦅', '👑', '⚡', '🌍', '🦊', '🐼', '🐯', '🎯', '🔥'];

export const ProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) : 0);
  const { stats, achievements, updateProfile, toggleSound, toggleHaptics, resetProgress } = useGame();

  const [showEditModal, setShowEditModal] = useState(false);
  const [editUsername, setEditUsername] = useState(stats.username || 'Explorador');
  const [editAvatar, setEditAvatar] = useState(stats.avatar || '🧭');
  const [editFavoriteCountryCode, setEditFavoriteCountryCode] = useState(stats.favoriteCountryCode || 'ec');
  const [countrySearch, setCountrySearch] = useState('');

  const levelInfo = getLevelInfo(stats.xp);
  const accuracy = stats.totalAnswers > 0
    ? Math.round((stats.correctAnswers / stats.totalAnswers) * 100)
    : 0;

  const currentFavCountry = COUNTRIES.find((c) => c.code === (stats.favoriteCountryCode || 'ec')) || COUNTRIES[0];

  const allCountriesSorted = useMemo(() => {
    return [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, []);

  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return allCountriesSorted;
    const query = countrySearch.toLowerCase().trim();
    return allCountriesSorted.filter((c) =>
      c.name.toLowerCase().includes(query)
    );
  }, [countrySearch, allCountriesSorted]);

  const selectedEditCountry = COUNTRIES.find((c) => c.code === editFavoriteCountryCode);

  const handleOpenEdit = () => {
    soundService.triggerLightTap();
    setEditUsername(stats.username || 'Explorador');
    setEditAvatar(stats.avatar || '🧭');
    setEditFavoriteCountryCode(stats.favoriteCountryCode || 'ec');
    setCountrySearch('');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    soundService.triggerSuccess();
    await updateProfile({
      username: editUsername.trim() || 'Explorador',
      avatar: editAvatar,
      favoriteCountryCode: editFavoriteCountryCode,
    });
    setShowEditModal(false);
  };

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
        {/* Profile Card with Custom Avatar & Nickname */}
        <AppleCard style={styles.profileCard} shadowLevel="large">
          <View style={styles.avatarRow}>
            <Pressable onPress={handleOpenEdit} style={styles.avatarCircleWrap}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarEmoji}>{stats.avatar || '🧭'}</Text>
              </View>
              <View style={styles.editPillBadge}>
                <Ionicons name="pencil" size={11} color="#FFFFFF" />
              </View>
            </Pressable>

            <View style={styles.playerMeta}>
              <View style={styles.nameRow}>
                <Text style={styles.playerName} numberOfLines={1}>
                  {stats.username || 'Explorador'}
                </Text>
                <Pressable onPress={handleOpenEdit} hitSlop={10} style={styles.editNameBtn}>
                  <Ionicons name="create-outline" size={18} color={IOSColors.systemBlue} />
                </Pressable>
              </View>

              <Text style={styles.playerTitle}>{levelInfo.title}</Text>

              <View style={styles.badgesRow}>
                <View style={styles.levelBadge}>
                  <Ionicons name="sparkles" size={12} color={IOSColors.systemPurple} />
                  <Text style={styles.levelBadgeText}>Nivel {levelInfo.level}</Text>
                </View>

                {currentFavCountry && (
                  <View style={styles.favCountryPill}>
                    <Text style={styles.favCountryEmoji}>{currentFavCountry.flagEmoji}</Text>
                    <Text style={styles.favCountryName} numberOfLines={1}>
                      {currentFavCountry.name}
                    </Text>
                  </View>
                )}
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

          {/* Edit Profile Quick Button */}
          <Pressable onPress={handleOpenEdit} style={styles.editProfileBtn}>
            <Ionicons name="person-circle-outline" size={16} color={IOSColors.systemBlue} />
            <Text style={styles.editProfileBtnText}>Personalizar Avatar y Nombre</Text>
          </Pressable>
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

        {/* Cloud Backup (Fase 2 Preview) */}
        <Text style={styles.sectionHeader}>CUENTA Y RESPALDO</Text>
        <AppleCard style={styles.cloudCard} shadowLevel="small">
          <View style={styles.cloudRow}>
            <View style={styles.cloudIconCircle}>
              <Ionicons name="cloud-outline" size={24} color={IOSColors.systemBlue} />
            </View>
            <View style={styles.cloudMeta}>
              <View style={styles.cloudTitleRow}>
                <Text style={styles.cloudTitle}>Respaldo en la Nube</Text>
                <View style={styles.soonPill}>
                  <Text style={styles.soonPillText}>FASE 2</Text>
                </View>
              </View>
              <Text style={styles.cloudDesc}>
                Tus datos están protegidos en este dispositivo. Próximamente podrás sincronizar tu progreso con Google sin costo.
              </Text>
            </View>
          </View>

          <View style={styles.storageStatusRow}>
            <Ionicons name="phone-portrait-outline" size={14} color={IOSColors.systemGreen} />
            <Text style={styles.storageStatusText}>Modo Local Activo • Guardado en AsyncStorage</Text>
          </View>
        </AppleCard>

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
                      !ach.unlocked && { color: IOSColors.secondaryLabel },
                    ]}
                  >
                    {ach.title}
                  </Text>
                  {ach.unlocked && (
                    <View style={styles.unlockedBadge}>
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    </View>
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

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: Platform.OS === 'android' ? topInset : 16 }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowEditModal(false)} hitSlop={10}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Editar Perfil</Text>
            <Pressable onPress={handleSaveEdit} hitSlop={10}>
              <Text style={styles.modalDoneText}>Guardar</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={[styles.modalContent, { paddingBottom: 60 + insets.bottom }]}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
          >
            {/* Avatar Preview */}
            <View style={styles.modalAvatarPreviewWrap}>
              <View style={styles.modalAvatarBig}>
                <Text style={styles.modalAvatarBigEmoji}>{editAvatar}</Text>
              </View>
              <Text style={styles.modalAvatarHelp}>Toca un avatar abajo para seleccionarlo</Text>
            </View>

            {/* Nickname Input */}
            <Text style={styles.modalSectionLabel}>NOMBRE DE EXPLORADOR</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color={IOSColors.secondaryLabel} style={{ marginRight: 10 }} />
              <TextInput
                value={editUsername}
                onChangeText={setEditUsername}
                placeholder="Escribe tu apodo..."
                placeholderTextColor={IOSColors.tertiaryLabel}
                maxLength={18}
                style={styles.modalInput}
                autoCorrect={false}
              />
              {editUsername.length > 0 && (
                <Pressable onPress={() => setEditUsername('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={IOSColors.tertiaryLabel} />
                </Pressable>
              )}
            </View>

            {/* Avatar Selector Grid */}
            <Text style={styles.modalSectionLabel}>ELIGE TU AVATAR</Text>
            <View style={styles.avatarGrid}>
              {AVATARS.map((av) => {
                const isSelected = editAvatar === av;
                return (
                  <Pressable
                    key={av}
                    onPress={() => {
                      soundService.triggerLightTap();
                      setEditAvatar(av);
                    }}
                    style={[
                      styles.avatarGridItem,
                      isSelected && styles.avatarGridItemSelected,
                    ]}
                  >
                    <Text style={styles.avatarGridEmoji}>{av}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Favorite Country / Flag */}
            <View style={styles.countryHeaderRow}>
              <Text style={styles.modalSectionLabel}>PAÍS O BANDERA FAVORITA</Text>
              {selectedEditCountry && (
                <View style={styles.selectedCountryPill}>
                  <Text style={styles.selectedCountryPillFlag}>{selectedEditCountry.flagEmoji}</Text>
                  <Text style={styles.selectedCountryPillText} numberOfLines={1}>
                    {selectedEditCountry.name}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.countrySearchWrap}>
              <Ionicons name="search" size={16} color={IOSColors.tertiaryLabel} style={{ marginRight: 8 }} />
              <TextInput
                value={countrySearch}
                onChangeText={setCountrySearch}
                placeholder="Buscar país..."
                placeholderTextColor={IOSColors.tertiaryLabel}
                style={styles.countrySearchInput}
                autoCorrect={false}
              />
              {countrySearch.length > 0 && (
                <Pressable onPress={() => setCountrySearch('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={IOSColors.tertiaryLabel} />
                </Pressable>
              )}
            </View>

            {filteredCountries.length === 0 ? (
              <View style={styles.emptySearchWrap}>
                <Ionicons name="search-outline" size={28} color={IOSColors.tertiaryLabel} />
                <Text style={styles.emptySearchText}>No se encontraron países para "{countrySearch}"</Text>
              </View>
            ) : (
              <View style={styles.countriesGrid}>
                {filteredCountries.map((c) => {
                  const isSelected = editFavoriteCountryCode === c.code;
                  return (
                    <Pressable
                      key={c.code}
                      onPress={() => {
                        soundService.triggerLightTap();
                        setEditFavoriteCountryCode(c.code);
                      }}
                      style={[
                        styles.countryChip,
                        isSelected && styles.countryChipSelected,
                      ]}
                    >
                      <Text style={styles.countryChipFlag}>{c.flagEmoji}</Text>
                      <Text
                        style={[
                          styles.countryChipName,
                          isSelected && styles.countryChipNameSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {c.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <AppleButton
              title="Guardar Cambios"
              onPress={handleSaveEdit}
              variant="gradient"
              style={{ marginTop: 28, width: '100%' }}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  avatarCircleWrap: {
    position: 'relative',
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(0, 122, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    ...IOSColors.cardShadow,
  },
  avatarEmoji: {
    fontSize: 34,
  },
  editPillBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: IOSColors.systemBlue,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  playerMeta: {
    marginLeft: 16,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  playerName: {
    fontSize: 22,
    fontWeight: '800',
    color: IOSColors.label,
    letterSpacing: -0.4,
    flex: 1,
  },
  editNameBtn: {
    padding: 4,
    marginLeft: 6,
  },
  playerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: IOSColors.secondaryLabel,
    marginBottom: 8,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(175, 82, 222, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: IOSColors.systemPurple,
    marginLeft: 4,
  },
  favCountryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  favCountryEmoji: {
    fontSize: 13,
    marginRight: 4,
  },
  favCountryName: {
    fontSize: 12,
    fontWeight: '600',
    color: IOSColors.label,
    maxWidth: 100,
  },
  xpSection: {
    marginTop: 4,
    marginBottom: 10,
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
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 6,
  },
  editProfileBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: IOSColors.systemBlue,
    marginLeft: 6,
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
  cloudCard: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  cloudRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cloudIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cloudMeta: {
    flex: 1,
  },
  cloudTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cloudTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: IOSColors.label,
    marginRight: 8,
  },
  soonPill: {
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  soonPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: IOSColors.systemBlue,
    letterSpacing: 0.5,
  },
  cloudDesc: {
    fontSize: 13,
    color: IOSColors.secondaryLabel,
    lineHeight: 18,
  },
  storageStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  storageStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: IOSColors.systemGreen,
    marginLeft: 6,
  },
  achievementsList: {
    gap: 12,
    marginBottom: 24,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  achievementIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  unlockedBadge: {
    backgroundColor: IOSColors.systemGreen,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementDesc: {
    fontSize: 13,
    color: IOSColors.secondaryLabel,
  },
  settingsCard: {
    marginBottom: 24,
    padding: 0,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
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
    backgroundColor: 'rgba(60, 60, 67, 0.15)',
    marginLeft: 50,
  },
  resetContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(60, 60, 67, 0.15)',
  },
  modalCancelText: {
    fontSize: 16,
    color: IOSColors.secondaryLabel,
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: IOSColors.label,
  },
  modalDoneText: {
    fontSize: 16,
    color: IOSColors.systemBlue,
    fontWeight: '700',
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  modalAvatarPreviewWrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalAvatarBig: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderWidth: 3,
    borderColor: IOSColors.systemBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    ...IOSColors.cardShadow,
  },
  modalAvatarBigEmoji: {
    fontSize: 48,
  },
  modalAvatarHelp: {
    fontSize: 13,
    color: IOSColors.secondaryLabel,
  },
  modalSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: IOSColors.secondaryLabel,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(118, 118, 128, 0.1)',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 20,
  },
  modalInput: {
    flex: 1,
    fontSize: 16,
    color: IOSColors.label,
    fontWeight: '600',
    paddingVertical: 0,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  avatarGridItem: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarGridItemSelected: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    borderColor: IOSColors.systemBlue,
    transform: [{ scale: 1.08 }],
  },
  avatarGridEmoji: {
    fontSize: 24,
  },
  countrySearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(118, 118, 128, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 38,
    marginBottom: 12,
  },
  countrySearchInput: {
    flex: 1,
    fontSize: 14,
    color: IOSColors.label,
    paddingVertical: 0,
  },
  countryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 10,
  },
  selectedCountryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  selectedCountryPillFlag: {
    fontSize: 13,
    marginRight: 4,
  },
  selectedCountryPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: IOSColors.systemBlue,
    maxWidth: 130,
  },
  emptySearchWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
  },
  emptySearchText: {
    fontSize: 13,
    color: IOSColors.secondaryLabel,
    marginTop: 8,
  },
  countriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  countryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  countryChipSelected: {
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    borderColor: IOSColors.systemBlue,
  },
  countryChipFlag: {
    fontSize: 16,
    marginRight: 6,
  },
  countryChipName: {
    fontSize: 13,
    fontWeight: '600',
    color: IOSColors.label,
    maxWidth: 120,
  },
  countryChipNameSelected: {
    color: IOSColors.systemBlue,
    fontWeight: '700',
  },
});
