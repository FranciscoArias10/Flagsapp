import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { TabType } from './src/types';
import { GameProvider, useGame } from './src/context/GameContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AppleTabBar } from './src/components/AppleTabBar';

import { PlayScreen } from './src/screens/PlayScreen';
import { CapitalsGameScreen } from './src/screens/CapitalsGameScreen';
import { AtlasScreen } from './src/screens/AtlasScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MainNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [currentTab, setCurrentTab] = useState<TabType>('play');
  const { newAchievementUnlocked, clearAchievementNotification } = useGame();
  const { isDark, colors } = useTheme();

  // Achievement Banner Animation
  const bannerY = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    if (newAchievementUnlocked) {
      Animated.sequence([
        Animated.spring(bannerY, {
          toValue: Math.max(insets.top, 24) + 10,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.delay(3200),
        Animated.timing(bannerY, {
          toValue: -120,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        clearAchievementNotification();
      });
    }
  }, [newAchievementUnlocked]);

  const renderActiveScreen = () => {
    switch (currentTab) {
      case 'play':
        return <PlayScreen />;
      case 'capitals':
        return <CapitalsGameScreen />;
      case 'atlas':
        return <AtlasScreen />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <PlayScreen />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.systemBackground }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Screen Content */}
      <View style={styles.screenContainer}>{renderActiveScreen()}</View>

      {/* iOS Translucent Tab Bar */}
      <AppleTabBar currentTab={currentTab} onTabChange={setCurrentTab} />

      {/* iOS Game Center Achievement Toast Banner */}
      {newAchievementUnlocked && (
        <Animated.View
          style={[
            styles.achievementBanner,
            { transform: [{ translateY: bannerY }] },
          ]}
        >
          <Pressable
            onPress={clearAchievementNotification}
            style={[
              styles.bannerInner,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.cardBorder,
              },
              colors.cardShadowLarge,
            ]}
          >
            <View
              style={[
                styles.bannerIconCircle,
                { backgroundColor: `${newAchievementUnlocked.color}25` },
              ]}
            >
              <Ionicons
                name={newAchievementUnlocked.icon as any}
                size={22}
                color={newAchievementUnlocked.color}
              />
            </View>
            <View style={styles.bannerTextWrap}>
              <Text style={[styles.bannerPretitle, { color: colors.systemPurple }]}>
                ¡LOGRO DESBLOQUEADO!
              </Text>
              <Text style={[styles.bannerTitle, { color: colors.label }]}>
                {newAchievementUnlocked.title}
              </Text>
            </View>
            <Ionicons name="sparkles" size={18} color={colors.goldStar} />
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <GameProvider>
          <MainNavigator />
        </GameProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
  },
  achievementBanner: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    zIndex: 99999,
  },
  bannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  bannerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bannerTextWrap: {
    flex: 1,
  },
  bannerPretitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
});
