import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IOSColors } from '../utils/colors';
import { soundService } from '../utils/soundHelper';

import { useTheme } from '../context/ThemeContext';

interface AppleHeaderProps {
  title: string;
  category?: string;
  rightAccessory?: React.ReactNode;
  onBack?: () => void;
  showBack?: boolean;
  showLogo?: boolean;
}

export const AppleHeader: React.FC<AppleHeaderProps> = ({
  title,
  category,
  rightAccessory,
  onBack,
  showBack = false,
  showLogo = false,
}) => {
  const { colors } = useTheme();

  const handleBack = () => {
    soundService.triggerLightTap();
    onBack?.();
  };

  return (
    <View style={styles.container}>
      {showBack && (
        <Pressable onPress={handleBack} style={styles.backButton} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.systemBlue} />
          <Text style={[styles.backText, { color: colors.systemBlue }]}>Atrás</Text>
        </Pressable>
      )}
      <View style={styles.headerRow}>
        <View style={styles.titleColumn}>
          {category && (
            <Text style={[styles.categoryText, { color: colors.systemBlue }]}>
              {category.toUpperCase()}
            </Text>
          )}
          <View style={styles.titleRow}>
            {showLogo && (
              <Image
                source={require('../../assets/icon.png')}
                style={styles.logoImage}
              />
            )}
            <Text
              style={[styles.largeTitle, { color: colors.label }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {title}
            </Text>
          </View>
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
    minWidth: 0,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: IOSColors.systemBlue,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 32,
    height: 32,
    borderRadius: 8,
    marginRight: 10,
  },
  largeTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: IOSColors.label,
    letterSpacing: -0.6,
  },
  rightAccessory: {
    marginLeft: 8,
    flexShrink: 0,
  },
});
