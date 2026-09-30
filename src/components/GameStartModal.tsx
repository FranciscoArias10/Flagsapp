import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { IOSColors } from '../utils/colors';
import { soundService } from '../utils/soundHelper';
import { AppleButton } from './AppleButton';

export interface GameStartModalProps {
  visible: boolean;
  onClose: () => void;
  onStart: (count: number | 'all', timeLimitSeconds: number) => void;
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
  gradient?: [string, string];
  initialCount?: number | 'all';
  initialTime?: number;
  showTimeSelector?: boolean;
  totalAvailable?: number;
}

export const GameStartModal: React.FC<GameStartModalProps> = ({
  visible,
  onClose,
  onStart,
  title,
  subtitle,
  icon = 'play',
  color = IOSColors.systemBlue,
  gradient = ['#007AFF', '#5856D6'],
  initialCount = 10,
  initialTime = 15,
  showTimeSelector = true,
  totalAvailable,
}) => {
  const [selectedCount, setSelectedCount] = useState<number | 'all'>(initialCount);
  const [selectedTime, setSelectedTime] = useState<number>(initialTime);

  useEffect(() => {
    if (visible) {
      setSelectedCount(initialCount);
      setSelectedTime(initialTime);
    }
  }, [visible, initialCount, initialTime]);

  const handleSelectCount = (cnt: number | 'all') => {
    soundService.triggerSelection();
    setSelectedCount(cnt);
  };

  const handleSelectTime = (sec: number) => {
    soundService.triggerSelection();
    setSelectedTime(sec);
  };

  const handleStart = () => {
    soundService.triggerMediumTap();
    onStart(selectedCount, selectedTime);
  };

  const timeOptions = [
    { sec: 10, label: '10s', sub: 'Ágil' },
    { sec: 15, label: '15s', sub: 'Estándar' },
    { sec: 20, label: '20s', sub: 'Relax' },
  ];

  const questionOptions: (number | 'all')[] = [10, 20, 50, 'all'];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheetContainer}>
              {/* Top Grabber */}
              <View style={styles.grabber} />

              {/* Close Button */}
              <Pressable
                onPress={() => {
                  soundService.triggerLightTap();
                  onClose();
                }}
                style={styles.closeBtn}
                hitSlop={12}
              >
                <Ionicons name="close-circle" size={28} color={IOSColors.tertiaryLabel} />
              </Pressable>

              {/* Header */}
              <View style={styles.header}>
                <LinearGradient
                  colors={gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconCircle}
                >
                  <Ionicons name={icon} size={26} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.headerText}>
                  <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
                    {title}
                  </Text>
                  {subtitle && (
                    <Text style={styles.subtitle} numberOfLines={1}>
                      {subtitle}
                    </Text>
                  )}
                </View>
              </View>

              {/* Section 1: Question Count Selector */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionLabel}>CANTIDAD DE PREGUNTAS</Text>
                  <Text style={[styles.sectionSub, { color }]}>
                    {selectedCount === 'all'
                      ? totalAvailable ? `${totalAvailable} Preguntas (Todas)` : 'Catálogo Completo'
                      : `${selectedCount} Preguntas`}
                  </Text>
                </View>

                <View style={styles.chipsRow}>
                  {questionOptions.map((cnt) => {
                    const isSel = selectedCount === cnt;
                    const lbl = cnt === 'all' ? 'Todas' : `${cnt}`;
                    return (
                      <Pressable
                        key={String(cnt)}
                        onPress={() => handleSelectCount(cnt)}
                        style={[
                          styles.chip,
                          isSel && [styles.chipActive, { backgroundColor: color, borderColor: color }],
                        ]}
                      >
                        <Text style={[styles.chipText, isSel && styles.chipTextActive]}>
                          {lbl}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Section 2: Time Selector or Fixed Rhythm Badge */}
              {showTimeSelector ? (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionLabel}>TIEMPO POR PREGUNTA</Text>
                    <Text style={[styles.sectionSub, { color }]}>
                      {selectedTime} segundos
                    </Text>
                  </View>

                  <View style={styles.chipsRow}>
                    {timeOptions.map((opt) => {
                      const isSel = selectedTime === opt.sec;
                      return (
                        <Pressable
                          key={opt.sec}
                          onPress={() => handleSelectTime(opt.sec)}
                          style={[
                            styles.timeChip,
                            isSel && [styles.chipActive, { backgroundColor: color, borderColor: color }],
                          ]}
                        >
                          <Ionicons
                            name="timer-outline"
                            size={14}
                            color={isSel ? '#FFFFFF' : IOSColors.secondaryLabel}
                          />
                          <Text style={[styles.timeChipText, isSel && styles.chipTextActive]}>
                            {opt.label}
                          </Text>
                          <Text style={[styles.timeChipSub, isSel && styles.timeChipSubActive]}>
                            {opt.sub}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : (
                <View style={styles.rhythmBadge}>
                  <Ionicons name="flash" size={16} color={color} />
                  <Text style={[styles.rhythmBadgeText, { color }]}>
                    Ritmo fijado: {initialTime}s iniciales con bonus por acierto
                  </Text>
                </View>
              )}

              {/* CTA Start Button */}
              <View style={styles.footer}>
                <AppleButton
                  title="¡Comenzar Partida!"
                  onPress={handleStart}
                  variant="gradient"
                  style={{ width: '100%' }}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    ...IOSColors.cardShadow,
  },
  grabber: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    alignSelf: 'center',
    marginBottom: 10,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 18,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    paddingRight: 36,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: IOSColors.label,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: IOSColors.secondaryLabel,
    fontWeight: '500',
    marginTop: 2,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: IOSColors.secondaryLabel,
    letterSpacing: 0.8,
  },
  sectionSub: {
    fontSize: 12,
    fontWeight: '700',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  chipActive: {
    borderColor: 'transparent',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '800',
    color: IOSColors.label,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  timeChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 14,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    gap: 2,
  },
  timeChipText: {
    fontSize: 13,
    fontWeight: '800',
    color: IOSColors.label,
  },
  timeChipSub: {
    fontSize: 10,
    fontWeight: '600',
    color: IOSColors.tertiaryLabel,
  },
  timeChipSubActive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  rhythmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 16,
  },
  rhythmBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  footer: {
    marginTop: 4,
  },
});
