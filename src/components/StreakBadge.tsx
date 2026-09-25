import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IOSColors } from '../utils/colors';

interface StreakBadgeProps {
  streak: number;
  size?: 'small' | 'medium' | 'large';
}

export const StreakBadge: React.FC<StreakBadgeProps> = ({ streak, size = 'medium' }) => {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (streak > 0) {
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.25,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [streak]);

  if (streak <= 0) return null;

  const isHighStreak = streak >= 5;

  return (
    <Animated.View
      style={[
        styles.container,
        isHighStreak && styles.containerHigh,
        size === 'small' && styles.containerSmall,
        size === 'large' && styles.containerLarge,
        { transform: [{ scale }] },
      ]}
    >
      <Ionicons
        name="flame"
        size={size === 'small' ? 14 : size === 'large' ? 20 : 16}
        color={isHighStreak ? '#FF3B30' : '#FF9500'}
      />
      <Text
        style={[
          styles.text,
          size === 'small' && styles.textSmall,
          size === 'large' && styles.textLarge,
          isHighStreak && styles.textHigh,
        ]}
      >
        {streak}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.3)',
  },
  containerHigh: {
    backgroundColor: 'rgba(255, 59, 48, 0.18)',
    borderColor: 'rgba(255, 59, 48, 0.4)',
  },
  containerSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  containerLarge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 24,
  },
  text: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '700',
    color: '#FF9500',
  },
  textSmall: {
    fontSize: 12,
    marginLeft: 2,
  },
  textLarge: {
    fontSize: 18,
    marginLeft: 6,
  },
  textHigh: {
    color: '#FF3B30',
  },
});
