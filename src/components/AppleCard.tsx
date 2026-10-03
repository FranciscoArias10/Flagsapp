import React, { useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  ViewStyle,
} from 'react-native';
import { IOSColors } from '../utils/colors';
import { soundService } from '../utils/soundHelper';

import { useTheme } from '../context/ThemeContext';

interface AppleCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  disabled?: boolean;
  shadowLevel?: 'none' | 'small' | 'large';
  backgroundColor?: string;
  borderRadius?: number;
}

export const AppleCard: React.FC<AppleCardProps> = ({
  children,
  style,
  onPress,
  disabled = false,
  shadowLevel = 'small',
  backgroundColor,
  borderRadius = 20,
}) => {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const activeBg = backgroundColor ?? colors.cardBackground;

  const handlePressIn = () => {
    if (!onPress || disabled) return;
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 35,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    if (!onPress || disabled) return;
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 35,
      bounciness: 6,
    }).start();
  };

  const handlePress = () => {
    if (!onPress || disabled) return;
    soundService.triggerLightTap();
    onPress();
  };

  const getShadowStyle = () => {
    if (shadowLevel === 'none') return null;
    if (shadowLevel === 'large') return colors.cardShadowLarge;
    return colors.cardShadow;
  };

  if (onPress) {
    return (
      <Animated.View style={[{ transform: [{ scale }] }]}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
          disabled={disabled}
          style={[
            styles.card,
            { backgroundColor: activeBg, borderRadius, borderColor: colors.cardBorder },
            getShadowStyle(),
            style,
          ]}
        >
          {children}
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: activeBg, borderRadius, borderColor: colors.cardBorder },
        getShadowStyle(),
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
