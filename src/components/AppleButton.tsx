import React, { useRef } from 'react';
import {
  Text,
  StyleSheet,
  Animated,
  Pressable,
  StyleProp,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IOSColors } from '../utils/colors';
import { soundService } from '../utils/soundHelper';

import { useTheme } from '../context/ThemeContext';

interface AppleButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'success' | 'danger' | 'gradient';
  icon?: React.ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: TextStyle;
  size?: 'small' | 'medium' | 'large';
  hapticStyle?: 'light' | 'medium' | 'heavy' | 'selection';
}

export const AppleButton: React.FC<AppleButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  style,
  textStyle,
  size = 'large',
  hapticStyle = 'light',
}) => {
  const { isDark, colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 8,
    }).start();
  };

  const handlePress = () => {
    if (disabled) return;
    if (hapticStyle === 'medium') soundService.triggerMediumTap();
    else if (hapticStyle === 'heavy') soundService.triggerHeavyTap();
    else soundService.triggerLightTap();
    onPress();
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12 };
      case 'medium':
        return { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 16 };
      case 'large':
      default:
        return { paddingVertical: 16, paddingHorizontal: 24, borderRadius: 18 };
    }
  };

  const getTextSizeStyle = () => {
    switch (size) {
      case 'small':
        return { fontSize: 13, fontWeight: '600' as const };
      case 'medium':
        return { fontSize: 15, fontWeight: '600' as const };
      case 'large':
      default:
        return { fontSize: 17, fontWeight: '700' as const };
    }
  };

  const renderContent = () => (
    <View style={styles.contentContainer}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text
        style={[
          styles.text,
          getTextSizeStyle(),
          variant === 'outline' && { color: colors.systemBlue },
          variant === 'secondary' && { color: colors.systemBlue },
          (variant === 'primary' || variant === 'gradient' || variant === 'success' || variant === 'danger') &&
            styles.textWhite,
          disabled && { color: colors.quaternaryLabel },
          textStyle,
        ]}
      >
        {title}
      </Text>
    </View>
  );

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.buttonBase,
          getSizeStyle(),
          variant === 'primary' && [{ backgroundColor: colors.systemBlue }, colors.buttonShadow],
          variant === 'secondary' && {
            backgroundColor: isDark ? 'rgba(120, 120, 128, 0.28)' : 'rgba(120, 120, 128, 0.12)',
          },
          variant === 'outline' && [styles.buttonOutline, { borderColor: colors.systemBlue }],
          variant === 'success' && [{ backgroundColor: colors.systemGreen }, { shadowColor: colors.systemGreen }],
          variant === 'danger' && [{ backgroundColor: colors.systemRed }, { shadowColor: colors.systemRed }],
          disabled && styles.buttonDisabled,
        ]}
      >
        {variant === 'gradient' && !disabled ? (
          <LinearGradient
            colors={['#007AFF', '#0051C7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: getSizeStyle().borderRadius }]}
          />
        ) : null}
        {renderContent()}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  buttonBase: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  buttonPrimary: {
    backgroundColor: IOSColors.systemBlue,
    ...IOSColors.buttonShadow,
  },
  buttonSecondary: {
    backgroundColor: 'rgba(120, 120, 128, 0.12)',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: IOSColors.systemBlue,
  },
  buttonSuccess: {
    backgroundColor: IOSColors.systemGreen,
    shadowColor: IOSColors.systemGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDanger: {
    backgroundColor: IOSColors.systemRed,
    shadowColor: IOSColors.systemRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(120, 120, 128, 0.08)',
    shadowOpacity: 0,
    elevation: 0,
  },
  text: {
    letterSpacing: -0.2,
  },
  textWhite: {
    color: '#FFFFFF',
  },
  textSecondary: {
    color: IOSColors.systemBlue,
  },
  textOutline: {
    color: IOSColors.systemBlue,
  },
  textDisabled: {
    color: IOSColors.quaternaryLabel,
  },
});
