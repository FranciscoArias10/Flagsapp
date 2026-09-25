import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IOSColors } from '../utils/colors';
import { soundService } from '../utils/soundHelper';

interface AppleHeaderProps {
  title: string;
  category?: string;
  rightAccessory?: React.ReactNode;
  onBack?: () => void;
  showBack?: boolean;
}

export const AppleHeader: React.FC<AppleHeaderProps> = ({
  title,
  category,
  rightAccessory,
  onBack,
  showBack = false,
}) => {
  const handleBack = () => {
    soundService.triggerLightTap();
    onBack?.();
  };

  return (
    <View style={styles.container}>
      {showBack && (
        <Pressable onPress={handleBack} style={styles.backButton} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={IOSColors.systemBlue} />
          <Text style={styles.backText}>Atrás</Text>
        </Pressable>
      )}
      <View style={styles.headerRow}>
        <View style={styles.titleColumn}>
          {category && <Text style={styles.categoryText}>{category.toUpperCase()}</Text>}
          <Text style={styles.largeTitle}>{title}</Text>
        </View>
        {rightAccessory && <View style={styles.rightAccessory}>{rightAccessory}</View>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: -6,
  },
  backText: {
    fontSize: 17,
    color: IOSColors.systemBlue,
    fontWeight: '400',
    marginLeft: -2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  titleColumn: {
    flex: 1,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: IOSColors.systemBlue,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  largeTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: IOSColors.label,
    letterSpacing: -0.6,
  },
  rightAccessory: {
    marginLeft: 12,
  },
});
