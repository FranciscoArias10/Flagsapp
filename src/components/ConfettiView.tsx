import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = [
  '#007AFF', // iOS Blue
  '#34C759', // iOS Green
  '#FF9500', // iOS Orange
  '#FF2D55', // iOS Pink
  '#AF52DE', // iOS Purple
  '#FFCC00', // iOS Yellow
  '#30B0C7', // iOS Teal
];

interface Particle {
  id: number;
  x: number;
  color: string;
  size: number;
  isCircle: boolean;
  animY: Animated.Value;
  animX: Animated.Value;
  animRotate: Animated.Value;
  animOpacity: Animated.Value;
}

interface ConfettiViewProps {
  active: boolean;
  count?: number;
  onFinish?: () => void;
}

export const ConfettiView: React.FC<ConfettiViewProps> = ({
  active,
  count = 45,
  onFinish,
}) => {
  const particles = useRef<Particle[]>([]);

  if (particles.current.length === 0) {
    particles.current = Array.from({ length: count }).map((_, i) => ({
      id: i,
      x: Math.random() * SCREEN_WIDTH,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: Math.floor(Math.random() * 8) + 6,
      isCircle: Math.random() > 0.5,
      animY: new Animated.Value(-30),
      animX: new Animated.Value(0),
      animRotate: new Animated.Value(0),
      animOpacity: new Animated.Value(1),
    }));
  }

  useEffect(() => {
    if (active) {
      const animations = particles.current.map((p) => {
        p.animY.setValue(-30);
        p.animX.setValue(0);
        p.animRotate.setValue(0);
        p.animOpacity.setValue(1);

        const duration = 2400 + Math.random() * 1200;
        const drift = (Math.random() - 0.5) * 160;

        return Animated.parallel([
          Animated.timing(p.animY, {
            toValue: SCREEN_HEIGHT + 40,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(p.animX, {
            toValue: drift,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(p.animRotate, {
            toValue: Math.random() * 10,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(p.animOpacity, {
            toValue: 0,
            duration: 600,
            delay: duration - 600,
            useNativeDriver: true,
          }),
        ]);
      });

      Animated.parallel(animations).start(() => {
        onFinish?.();
      });
    }
  }, [active]);

  if (!active) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.current.map((p) => {
        const rotate = p.animRotate.interpolate({
          inputRange: [0, 10],
          outputRange: ['0deg', '1080deg'],
        });

        return (
          <Animated.View
            key={p.id}
            style={[
              styles.particle,
              {
                left: p.x,
                width: p.size,
                height: p.isCircle ? p.size : p.size * 1.6,
                backgroundColor: p.color,
                borderRadius: p.isCircle ? p.size / 2 : 2,
                transform: [
                  { translateY: p.animY },
                  { translateX: p.animX },
                  { rotate },
                ],
                opacity: p.animOpacity,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
  },
  particle: {
    position: 'absolute',
    top: 0,
  },
});
