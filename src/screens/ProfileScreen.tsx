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
  Share,
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
import { SegmentedControl } from '../components/SegmentedControl';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { ThemePreference, LanguagePreference } from '../types';

const AVATARS = ['🧭', '🦁', '🚀', '🦅', '👑', '⚡', '🌍', '🦊', '🐼', '🐯', '🎯', '🔥'];

export const ProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) : 0);
  const { stats, achievements, updateProfile, toggleSound, toggleHaptics, toggleFastAnswerOpportunity, toggleVoiceAnnouncer, resetProgress, exportBackupData, importBackupData } = useGame();
  const { themePreference, isDark, colors, setThemePreference } = useTheme();
  const {
    language,
    languagePreference,
    setLanguagePreference,
    t,
    getCountryName,
    getAchievementInfo,
  } = useLanguage();

  const [showEditModal, setShowEditModal] = useState(false);
  const [editUsername, setEditUsername] = useState(stats.username || 'Explorador');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [editAvatar, setEditAvatar] = useState(stats.avatar || '🧭');
  const [editFavoriteCountryCode, setEditFavoriteCountryCode] = useState(stats.favoriteCountryCode || 'ec');
  const [countrySearch, setCountrySearch] = useState('');

  // Backup & Restore states
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreInputText, setRestoreInputText] = useState('');
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

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
    setUsernameError(null);
    setEditAvatar(stats.avatar || '🧭');
    setEditFavoriteCountryCode(stats.favoriteCountryCode || 'ec');
    setCountrySearch('');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    const trimmed = editUsername.trim();
    if (!trimmed) {
      soundService.triggerError();
      setUsernameError('El nombre o apodo es obligatorio.');
      Alert.alert(
        'Apodo Obligatorio',
        'Debes escribir un nombre o apodo para tu explorador antes de guardar.',
        [{ text: 'Entendido', style: 'default' }]
      );
      return;
    }

    if (trimmed.length < 2) {
      soundService.triggerError();
      setUsernameError('El apodo debe tener al menos 2 caracteres.');
      Alert.alert(
        'Nombre muy corto',
        'El apodo debe contener al menos 2 caracteres.',
        [{ text: 'Entendido', style: 'default' }]
      );
      return;
    }

    soundService.triggerSuccess();
    setUsernameError(null);
    await updateProfile({
      username: trimmed,
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

  const handleExportBackup = async () => {
    try {
      soundService.triggerLightTap();
      setIsExporting(true);
      const jsonString = await exportBackupData();
      await Share.share({
        title: `Respaldo Flags++ - ${stats.username || 'Explorador'}`,
        message: jsonString,
      });
      soundService.triggerSuccess();
    } catch (error) {
      Alert.alert('Error', 'No se pudo generar la copia de respaldo en este momento.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenRestoreModal = () => {
    soundService.triggerLightTap();
    setRestoreInputText('');
    setRestoreError(null);
    setShowRestoreModal(true);
  };

  const handleConfirmRestore = async () => {
    if (!restoreInputText.trim()) {
      setRestoreError('Por favor pega el código o texto del respaldo.');
      soundService.triggerError();
      return;
    }

    const res = await importBackupData(restoreInputText);
    if (res.success) {
      setShowRestoreModal(false);
      setRestoreInputText('');
      setRestoreError(null);
      Alert.alert('¡Restauración Completa!', res.message, [{ text: 'Continuar' }]);
    } else {
      setRestoreError(res.message);
      soundService.triggerError();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.systemBackground, paddingTop: topInset }]}>
      <AppleHeader
        title={t('profile_title')}
        category={t('header_category_user')}
        rightAccessory={
          <Pressable
            onPress={() => {
              soundService.triggerSelection();
              setThemePreference(isDark ? 'light' : 'dark');
            }}
            style={({ pressed }) => [
              styles.themeToggleBtn,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.06)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.1)',
              },
              pressed && { opacity: 0.75, transform: [{ scale: 0.95 }] },
            ]}
            hitSlop={8}
          >
            <Ionicons
              name={isDark ? "sunny" : "moon"}
              size={18}
              color={isDark ? "#FFD60A" : "#5856D6"}
            />
            <Text style={[styles.themeToggleBtnText, { color: colors.label }]}>
              {isDark ? (language === 'en' ? "Light" : "Claro") : (language === 'en' ? "Dark" : "Oscuro")}
            </Text>
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 130 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card with Custom Avatar & Nickname */}
        <AppleCard style={styles.profileCard} shadowLevel="large">
          <View style={styles.avatarRow}>
            <Pressable onPress={handleOpenEdit} style={styles.avatarCircleWrap}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarEmoji}>{stats.avatar || '🧭'}</Text>
              </View>
              <View style={[styles.editPillBadge, { borderColor: colors.cardBackground }]}>
                <Ionicons name="pencil" size={11} color="#FFFFFF" />
              </View>
            </Pressable>

            <View style={styles.playerMeta}>
              <View style={styles.nameRow}>
                <Text style={[styles.playerName, { color: colors.label }]} numberOfLines={1}>
                  {stats.username || 'Explorador'}
                </Text>
                <Pressable onPress={handleOpenEdit} hitSlop={10} style={styles.editNameBtn}>
                  <Ionicons name="create-outline" size={18} color={colors.systemBlue} />
                </Pressable>
              </View>

              <Text style={[styles.playerTitle, { color: colors.secondaryLabel }]}>{levelInfo.title}</Text>

              <View style={styles.badgesRow}>
                <View style={styles.levelBadge}>
                  <Ionicons name="sparkles" size={12} color={colors.systemPurple} />
                  <Text style={[styles.levelBadgeText, { color: colors.systemPurple }]}>Nivel {levelInfo.level}</Text>
                </View>

                {currentFavCountry && (
                  <View style={[styles.favCountryPill, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }]}>
                    <Text style={styles.favCountryEmoji}>{currentFavCountry.flagEmoji}</Text>
                    <Text style={[styles.favCountryName, { color: colors.label }]} numberOfLines={1}>
                      {getCountryName(currentFavCountry.code, currentFavCountry.name)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* XP Progress */}
          <View style={styles.xpSection}>
            <View style={styles.xpLabelRow}>
              <Text style={[styles.xpText, { color: colors.label }]}>
                {stats.xp} {language === 'en' ? 'XP accumulated' : 'XP acumulados'}
              </Text>
              <Text style={[styles.xpNextText, { color: colors.secondaryLabel }]}>
                {levelInfo.xpToNext > 0
                  ? language === 'en'
                    ? `${levelInfo.xpToNext} XP to next level`
                    : `${levelInfo.xpToNext} XP para el sig. nivel`
                  : language === 'en'
                  ? 'Max Level!'
                  : '¡Nivel Máximo!'}
              </Text>
            </View>
            <ProgressBar
              progress={levelInfo.progress}
              height={10}
              gradientColors={['#007AFF', '#AF52DE']}
            />
          </View>

          {/* Edit Profile Quick Button */}
          <Pressable onPress={handleOpenEdit} style={[styles.editProfileBtn, { backgroundColor: isDark ? 'rgba(10, 132, 255, 0.18)' : 'rgba(0, 122, 255, 0.08)' }]}>
            <Ionicons name="person-circle-outline" size={16} color={colors.systemBlue} />
            <Text style={[styles.editProfileBtnText, { color: colors.systemBlue }]}>
              {language === 'en' ? 'Customize Avatar and Nickname' : 'Personalizar Avatar y Nombre'}
            </Text>
          </Pressable>
        </AppleCard>

        {/* Global Statistics */}
        <Text style={[styles.sectionHeader, { color: colors.secondaryLabel }]}>
          {language === 'en' ? 'STATISTICS' : 'ESTADÍSTICAS'}
        </Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1 }]}>
            <Ionicons name="game-controller" size={24} color={colors.systemBlue} />
            <Text style={[styles.statVal, { color: colors.label }]}>{stats.gamesPlayed}</Text>
            <Text style={[styles.statLbl, { color: colors.secondaryLabel }]}>{t('profile_stat_games')}</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1 }]}>
            <Ionicons name="flame" size={24} color={colors.systemOrange} />
            <Text style={[styles.statVal, { color: colors.systemOrange }]}>{stats.bestStreak}</Text>
            <Text style={[styles.statLbl, { color: colors.secondaryLabel }]}>{t('profile_stat_best_streak')}</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1 }]}>
            <Ionicons name="checkmark-done-circle" size={24} color={colors.systemGreen} />
            <Text style={[styles.statVal, { color: colors.label }]}>{stats.correctAnswers}</Text>
            <Text style={[styles.statLbl, { color: colors.secondaryLabel }]}>
              {language === 'en' ? 'Correct Flags' : 'Banderas Acertadas'}
            </Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1 }]}>
            <Ionicons name="pie-chart" size={24} color={colors.systemPurple} />
            <Text style={[styles.statVal, { color: colors.systemPurple }]}>{accuracy}%</Text>
            <Text style={[styles.statLbl, { color: colors.secondaryLabel }]}>
              {language === 'en' ? 'Global Accuracy' : 'Precisión Global'}
            </Text>
          </View>
        </View>

        {/* Cloud & Local Backup */}
        <Text style={[styles.sectionHeader, { color: colors.secondaryLabel }]}>
          {t('profile_section_backup')}
        </Text>
        <AppleCard style={styles.cloudCard} shadowLevel="small">
          <View style={styles.cloudRow}>
            <View style={[styles.cloudIconCircle, { backgroundColor: isDark ? 'rgba(10, 132, 255, 0.2)' : 'rgba(0, 122, 255, 0.1)' }]}>
              <Ionicons name="cloud-done" size={24} color={colors.systemBlue} />
            </View>
            <View style={styles.cloudMeta}>
              <View style={styles.cloudTitleRow}>
                <Text style={[styles.cloudTitle, { color: colors.label }]}>
                  {language === 'en' ? 'Backup & Restore' : 'Respaldo y Restauración'}
                </Text>
                <View style={styles.activeBackupPill}>
                  <Text style={styles.activeBackupPillText}>
                    {language === 'en' ? 'AVAILABLE' : 'DISPONIBLE'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.cloudDesc, { color: colors.secondaryLabel }]}>
                {language === 'en'
                  ? 'Save a copy of your level, XP, avatar, and achievements in Google Drive, WhatsApp, or Notes, or restore your progress on any device.'
                  : 'Guarda una copia de tu nivel, XP, avatar y logros en Google Drive, WhatsApp o Notas, o restaura tu progreso en cualquier dispositivo.'}
              </Text>
            </View>
          </View>

          {/* Backup Action Buttons */}
          <View style={styles.backupActionsRow}>
            <Pressable
              onPress={handleExportBackup}
              disabled={isExporting}
              style={({ pressed }) => [
                styles.backupBtnPrimary,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons name="cloud-upload-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.backupBtnPrimaryText}>
                {isExporting
                  ? (language === 'en' ? 'Generating...' : 'Generando...')
                  : (language === 'en' ? 'Create Backup' : 'Crear Respaldo')}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleOpenRestoreModal}
              style={({ pressed }) => [
                styles.backupBtnSecondary,
                { backgroundColor: isDark ? 'rgba(10, 132, 255, 0.18)' : 'rgba(0, 122, 255, 0.1)' },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Ionicons name="cloud-download-outline" size={16} color={colors.systemBlue} style={{ marginRight: 6 }} />
              <Text style={[styles.backupBtnSecondaryText, { color: colors.systemBlue }]}>
                {language === 'en' ? 'Restore' : 'Restaurar'}
              </Text>
            </Pressable>
          </View>

          <View style={[styles.storageStatusRow, { borderTopColor: colors.separator }]}>
            <Ionicons name="shield-checkmark" size={14} color={colors.systemGreen} />
            <Text style={[styles.storageStatusText, { color: colors.systemGreen }]}>
              {language === 'en'
                ? 'Secure storage • Free unlimited backup'
                : 'Almacenamiento seguro • Respaldable sin costo'}
            </Text>
          </View>
        </AppleCard>

        {/* Achievements Section */}
        <Text style={[styles.sectionHeader, { color: colors.secondaryLabel }]}>
          {t('profile_section_achievements')}
        </Text>
        <View style={styles.achievementsList}>
          {achievements.map((ach) => {
            const achInfo = getAchievementInfo(ach.id, ach.title, ach.description);
            return (
              <AppleCard key={ach.id} style={styles.achievementCard}>
                <View
                  style={[
                    styles.achievementIconCircle,
                    { backgroundColor: ach.unlocked ? `${ach.color}25` : isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(120, 120, 128, 0.1)' },
                  ]}
                >
                  <Ionicons
                    name={ach.icon as any}
                    size={24}
                    color={ach.unlocked ? ach.color : colors.tertiaryLabel}
                  />
                </View>

                <View style={styles.achievementMeta}>
                  <View style={styles.achievementTitleRow}>
                    <Text
                      style={[
                        styles.achievementTitle,
                        { color: ach.unlocked ? colors.label : colors.secondaryLabel },
                      ]}
                    >
                      {achInfo.title}
                    </Text>
                    {ach.unlocked && (
                      <View style={styles.unlockedBadge}>
                        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                  <Text style={[styles.achievementDesc, { color: colors.secondaryLabel }]}>
                    {achInfo.description}
                  </Text>
                </View>
              </AppleCard>
            );
          })}
        </View>

        {/* Settings */}
        <Text style={[styles.sectionHeader, { color: colors.secondaryLabel }]}>
          {t('profile_section_settings')}
        </Text>
        <AppleCard style={styles.settingsCard}>
          {/* Apariencia / Modo Oscuro */}
          <View style={styles.settingRow}>
            <View style={[styles.settingLabelWrap, { flex: 1, paddingRight: 10 }]}>
              <Ionicons
                name={isDark ? "moon" : "sunny"}
                size={22}
                color={isDark ? colors.systemIndigo : colors.systemYellow}
                style={{ marginRight: 12 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingTitle, { color: colors.label }]}>
                  {t('profile_setting_theme')}
                </Text>
                <Text style={[styles.settingSubtitle, { color: colors.secondaryLabel }]}>
                  {themePreference === 'system'
                    ? `${t('profile_theme_system')} (${isDark ? (language === 'en' ? 'Dark active' : 'Oscuro activo') : (language === 'en' ? 'Light active' : 'Claro activo')})`
                    : themePreference === 'dark'
                    ? (language === 'en' ? 'Dark Mode always active' : 'Modo Oscuro siempre activo')
                    : (language === 'en' ? 'Light Mode always active' : 'Modo Claro siempre activo')}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ paddingHorizontal: 12, paddingBottom: 10, paddingTop: 4 }}>
            <SegmentedControl
              values={['📱 ' + t('profile_theme_system'), '☀️ ' + t('profile_theme_light'), '🌙 ' + t('profile_theme_dark')]}
              selectedIndex={themePreference === 'system' ? 0 : themePreference === 'light' ? 1 : 2}
              onChange={(index) => {
                const prefs: ThemePreference[] = ['system', 'light', 'dark'];
                setThemePreference(prefs[index]);
              }}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.separator }]} />

          {/* Idioma / Language */}
          <View style={styles.settingRow}>
            <View style={[styles.settingLabelWrap, { flex: 1, paddingRight: 10 }]}>
              <Ionicons
                name="globe-outline"
                size={22}
                color={colors.systemBlue}
                style={{ marginRight: 12 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingTitle, { color: colors.label }]}>
                  {t('profile_setting_language')}
                </Text>
                <Text style={[styles.settingSubtitle, { color: colors.secondaryLabel }]}>
                  {languagePreference === 'system'
                    ? `${t('profile_lang_system')} (${language === 'en' ? 'English' : 'Español'})`
                    : languagePreference === 'en'
                    ? 'English'
                    : 'Español'}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ paddingHorizontal: 12, paddingBottom: 10, paddingTop: 4 }}>
            <SegmentedControl
              values={['📱 ' + t('profile_lang_system'), '🇪🇸 ' + t('profile_lang_es'), '🇺🇸 ' + t('profile_lang_en')]}
              selectedIndex={languagePreference === 'system' ? 0 : languagePreference === 'es' ? 1 : 2}
              onChange={(index) => {
                const prefs: LanguagePreference[] = ['system', 'es', 'en'];
                setLanguagePreference(prefs[index]);
              }}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.separator }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingLabelWrap}>
              <Ionicons name="volume-high" size={22} color={colors.systemBlue} style={{ marginRight: 12 }} />
              <Text style={[styles.settingTitle, { color: colors.label }]}>
                {t('profile_setting_sound')}
              </Text>
            </View>
            <Switch
              value={stats.soundEnabled}
              onValueChange={toggleSound}
              trackColor={{ false: isDark ? '#38383A' : '#E5E5EA', true: colors.systemGreen }}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.separator }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingLabelWrap}>
              <Ionicons name="hardware-chip" size={22} color={colors.systemPurple} style={{ marginRight: 12 }} />
              <Text style={[styles.settingTitle, { color: colors.label }]}>
                {t('profile_setting_haptics')}
              </Text>
            </View>
            <Switch
              value={stats.hapticsEnabled}
              onValueChange={toggleHaptics}
              trackColor={{ false: isDark ? '#38383A' : '#E5E5EA', true: colors.systemGreen }}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.separator }]} />

          <View style={styles.settingRow}>
            <View style={[styles.settingLabelWrap, { flex: 1, paddingRight: 10 }]}>
              <Ionicons name="flash" size={22} color={colors.systemOrange} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingTitle, { color: colors.label }]}>
                  {t('profile_setting_speed_shield')}
                </Text>
                <Text style={[styles.settingSubtitle, { color: colors.secondaryLabel }]}>
                  {t('profile_setting_speed_shield_desc')}
                </Text>
              </View>
            </View>
            <Switch
              value={stats.fastAnswerOpportunityEnabled !== false}
              onValueChange={toggleFastAnswerOpportunity}
              trackColor={{ false: isDark ? '#38383A' : '#E5E5EA', true: colors.systemGreen }}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.separator }]} />

          <View style={styles.settingRow}>
            <View style={[styles.settingLabelWrap, { flex: 1, paddingRight: 10 }]}>
              <Ionicons name="mic" size={22} color={colors.systemGreen} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingTitle, { color: colors.label }]}>
                  {t('profile_setting_voice')}
                </Text>
                <Text style={[styles.settingSubtitle, { color: colors.secondaryLabel }]}>
                  {t('profile_setting_voice_desc')}
                </Text>
              </View>
            </View>
            <Switch
              value={Boolean(stats.voiceAnnouncerEnabled)}
              onValueChange={toggleVoiceAnnouncer}
              trackColor={{ false: isDark ? '#38383A' : '#E5E5EA', true: colors.systemGreen }}
            />
          </View>
        </AppleCard>

        <View style={styles.resetContainer}>
          <AppleButton
            title={t('profile_reset_btn')}
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
        <View style={[styles.modalContainer, { backgroundColor: colors.systemBackground, paddingTop: Platform.OS === 'android' ? topInset : 16 }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.separator }]}>
            <Pressable onPress={() => setShowEditModal(false)} hitSlop={10}>
              <Text style={styles.modalCancelText}>{t('profile_cancel')}</Text>
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.label }]}>
              {language === 'en' ? 'Edit Profile' : 'Editar Perfil'}
            </Text>
            <Pressable onPress={handleSaveEdit} hitSlop={10}>
              <Text style={[styles.modalDoneText, { color: colors.systemBlue }]}>
                {t('profile_nickname_save')}
              </Text>
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
              <Text style={styles.modalAvatarHelp}>
                {language === 'en' ? 'Tap an avatar below to select it' : 'Toca un avatar abajo para seleccionarlo'}
              </Text>
            </View>

            {/* Nickname Input */}
            <View style={styles.inputLabelRow}>
              <Text style={styles.modalSectionLabel}>
                {language === 'en' ? 'EXPLORER NAME *' : 'NOMBRE DE EXPLORADOR *'}
              </Text>
              <View style={styles.mandatoryBadge}>
                <Text style={styles.mandatoryBadgeText}>
                  {language === 'en' ? 'Required' : 'Obligatorio'}
                </Text>
              </View>
            </View>

            <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.cardBorder }, !!usernameError && styles.inputWrapperError]}>
              <Ionicons
                name="person-outline"
                size={20}
                color={usernameError ? colors.systemRed : colors.secondaryLabel}
                style={{ marginRight: 10 }}
              />
              <TextInput
                value={editUsername}
                onChangeText={(text) => {
                  setEditUsername(text);
                  if (usernameError && text.trim().length > 0) {
                    setUsernameError(null);
                  }
                }}
                placeholder={t('profile_nickname_placeholder')}
                placeholderTextColor={colors.tertiaryLabel}
                maxLength={18}
                style={[styles.modalInput, { color: colors.label }]}
                autoCorrect={false}
              />
              {editUsername.length > 0 && (
                <Pressable
                  onPress={() => {
                    setEditUsername('');
                    setUsernameError(language === 'en' ? 'Nickname is required.' : 'El nombre o apodo es obligatorio.');
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={18} color={colors.tertiaryLabel} />
                </Pressable>
              )}
            </View>

            {!!usernameError && (
              <View style={styles.errorMessageRow}>
                <Ionicons name="alert-circle" size={14} color={IOSColors.systemRed} style={{ marginRight: 5 }} />
                <Text style={styles.errorMessageText}>{usernameError}</Text>
              </View>
            )}

            {/* Avatar Selector Grid */}
            <Text style={styles.modalSectionLabel}>
              {language === 'en' ? 'CHOOSE YOUR AVATAR' : 'ELIGE TU AVATAR'}
            </Text>
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
                    {isSelected && (
                      <View style={styles.selectedAvatarCheck}>
                        <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Favorite Country / Flag */}
            <View style={styles.countryHeaderRow}>
              <Text style={[styles.modalSectionLabel, { color: colors.secondaryLabel }]}>
                {language === 'en' ? 'FAVORITE COUNTRY OR FLAG' : 'PAÍS O BANDERA FAVORITA'}
              </Text>
              {selectedEditCountry && (
                <View style={[styles.selectedCountryPill, { backgroundColor: isDark ? 'rgba(0, 122, 255, 0.2)' : 'rgba(0, 122, 255, 0.1)' }]}>
                  <Text style={styles.selectedCountryPillFlag}>{selectedEditCountry.flagEmoji}</Text>
                  <Text style={[styles.selectedCountryPillText, { color: colors.systemBlue }]} numberOfLines={1}>
                    {getCountryName(selectedEditCountry.code, selectedEditCountry.name)}
                  </Text>
                </View>
              )}
            </View>

            <View style={[styles.countrySearchWrap, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <Ionicons name="search" size={16} color={colors.tertiaryLabel} style={{ marginRight: 8 }} />
              <TextInput
                value={countrySearch}
                onChangeText={setCountrySearch}
                placeholder={language === 'en' ? 'Search country...' : 'Buscar país...'}
                placeholderTextColor={colors.tertiaryLabel}
                style={[styles.countrySearchInput, { color: colors.label }]}
                autoCorrect={false}
              />
              {countrySearch.length > 0 && (
                <Pressable onPress={() => setCountrySearch('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={colors.tertiaryLabel} />
                </Pressable>
              )}
            </View>

            {filteredCountries.length === 0 ? (
              <View style={styles.emptySearchWrap}>
                <Ionicons name="search-outline" size={28} color={IOSColors.tertiaryLabel} />
                <Text style={styles.emptySearchText}>
                  {language === 'en'
                    ? `No countries found for "${countrySearch}"`
                    : `No se encontraron países para "${countrySearch}"`}
                </Text>
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
                      >
                        {getCountryName(c.code, c.name)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <AppleButton
              title={language === 'en' ? 'Save Changes' : 'Guardar Cambios'}
              onPress={handleSaveEdit}
              variant="gradient"
              style={{ marginTop: 28, width: '100%' }}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Restore Backup Modal */}
      <Modal
        visible={showRestoreModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRestoreModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.systemBackground, paddingTop: topInset }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.separator }]}>
            <Pressable onPress={() => setShowRestoreModal(false)} hitSlop={10}>
              <Text style={styles.modalCancelText}>{t('profile_cancel')}</Text>
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.label }]}>
              {language === 'en' ? 'Restore Data' : 'Restaurar Datos'}
            </Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView
            contentContainerStyle={[styles.modalContent, { paddingBottom: 40 + insets.bottom }]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.restoreHeaderIconWrap}>
              <View style={styles.restoreIconCircleBig}>
                <Ionicons name="cloud-download" size={36} color={colors.systemBlue} />
              </View>
              <Text style={[styles.restorePromptTitle, { color: colors.label }]}>
                {language === 'en' ? 'Recover Your Progress' : 'Recupera tu Progreso'}
              </Text>
              <Text style={[styles.restorePromptSub, { color: colors.secondaryLabel }]}>
                {language === 'en'
                  ? 'Paste below the JSON or text from the backup you previously saved:'
                  : 'Pega a continuación el texto o JSON del respaldo que guardaste previamente:'}
              </Text>
            </View>

            <TextInput
              value={restoreInputText}
              onChangeText={(txt) => {
                setRestoreInputText(txt);
                if (restoreError) setRestoreError(null);
              }}
              placeholder={
                language === 'en'
                  ? 'Paste backup JSON here (e.g. {"app":"Flags++", ...})'
                  : 'Pega aquí el código JSON del respaldo (ej: {"app":"Flags++", ...})'
              }
              placeholderTextColor={colors.tertiaryLabel}
              multiline
              numberOfLines={6}
              style={[
                styles.restoreInputArea,
                { backgroundColor: colors.surface, color: colors.label, borderColor: colors.cardBorder },
                !!restoreError && styles.inputWrapperError,
              ]}
              autoCorrect={false}
              autoCapitalize="none"
            />

            {restoreInputText.length > 0 && (
              <Pressable
                onPress={() => setRestoreInputText('')}
                style={styles.clearRestoreBtn}
              >
                <Ionicons name="trash-outline" size={14} color={IOSColors.secondaryLabel} />
                <Text style={styles.clearRestoreBtnText}>
                  {language === 'en' ? 'Clear text' : 'Limpiar texto'}
                </Text>
              </Pressable>
            )}

            {!!restoreError && (
              <View style={[styles.errorMessageRow, { marginTop: 10 }]}>
                <Ionicons name="alert-circle" size={16} color={IOSColors.systemRed} style={{ marginRight: 6 }} />
                <Text style={styles.errorMessageText}>{restoreError}</Text>
              </View>
            )}

            <AppleButton
              title={language === 'en' ? 'Validate & Restore' : 'Validar y Restaurar'}
              onPress={handleConfirmRestore}
              variant="gradient"
              style={{ marginTop: 24, width: '100%' }}
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
  themeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  themeToggleBtnText: {
    fontSize: 13,
    fontWeight: '700',
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
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 44,
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
    marginBottom: 20,
  },
  statBox: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
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
  activeBackupPill: {
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeBackupPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: IOSColors.systemGreen,
    letterSpacing: 0.5,
  },
  cloudDesc: {
    fontSize: 13,
    color: IOSColors.secondaryLabel,
    lineHeight: 18,
  },
  backupActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    marginBottom: 8,
  },
  backupBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: IOSColors.systemBlue,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
    ...IOSColors.buttonShadow,
  },
  backupBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  backupBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  backupBtnSecondaryText: {
    color: IOSColors.systemBlue,
    fontSize: 13,
    fontWeight: '700',
  },
  restoreHeaderIconWrap: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  restoreIconCircleBig: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  restorePromptTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: IOSColors.label,
    marginBottom: 6,
  },
  restorePromptSub: {
    fontSize: 14,
    color: IOSColors.secondaryLabel,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  restoreInputArea: {
    backgroundColor: 'rgba(118, 118, 128, 0.08)',
    borderRadius: 16,
    padding: 14,
    minHeight: 120,
    fontSize: 13,
    color: IOSColors.label,
    textAlignVertical: 'top',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  clearRestoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 8,
    gap: 4,
  },
  clearRestoreBtnText: {
    fontSize: 12,
    color: IOSColors.secondaryLabel,
    fontWeight: '600',
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
  settingSubtitle: {
    fontSize: 12,
    color: IOSColors.secondaryLabel,
    marginTop: 2,
    lineHeight: 16,
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
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  modalAvatarBigEmoji: {
    fontSize: 58,
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
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 6,
  },
  mandatoryBadge: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  mandatoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: IOSColors.systemRed,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(118, 118, 128, 0.1)',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputWrapperError: {
    borderColor: IOSColors.systemRed,
    backgroundColor: 'rgba(255, 59, 48, 0.06)',
    marginBottom: 8,
  },
  errorMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -2,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  errorMessageText: {
    fontSize: 12,
    fontWeight: '600',
    color: IOSColors.systemRed,
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
    justifyContent: 'center',
  },
  avatarGridItem: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGridItemSelected: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderWidth: 2,
    borderColor: IOSColors.systemBlue,
    transform: [{ scale: 1.12 }],
  },
  avatarGridEmoji: {
    fontSize: 30,
  },
  selectedAvatarCheck: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: IOSColors.systemBlue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
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
  },
  countryChipNameSelected: {
    color: IOSColors.systemBlue,
    fontWeight: '700',
  },
});
