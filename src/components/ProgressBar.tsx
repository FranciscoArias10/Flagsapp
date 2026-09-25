import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IOSColors } from '../utils/colors';

interface ProgressBarProps {
  progress: number; // 0 to 1
  height?: number;
  gradientColors?: [string, string];
  style?: ViewStyle;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 8,
  gradientColors = [IOSColors.systemBlue, '#5856D6'],
  style,
}) => {
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animatedWidth, {
      toValue: Math.max(0, Math.min(1, progress)),
      useNativeDriver: false,
      speed: 14,
      bounciness: 4,
    }).start();
  }, [progress]);

  const widthInterpolated = animatedWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }, style]}>
      <Animated.View
        style={[
          styles.fillContainer,
          { width: widthInterpolated, height, borderRadius: height / 2 },
        ]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFill, { borderRadius: height / 2 }]}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    backgroundColor: 'rgba(120, 120, 128, 0.16)',
    width: '100%',
    overflow: 'hidden',
  },
  fillContainer: {
    overflow: 'hidden',
  },
});
