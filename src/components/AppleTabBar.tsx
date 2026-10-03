import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TabType } from '../types';
import { IOSColors } from '../utils/colors';
import { soundService } from '../utils/soundHelper';

import { useTheme } from '../context/ThemeContext';

interface AppleTabBarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
}

interface TabItem {
  id: TabType;
  label: string;
  iconActive: keyof typeof Ionicons.glyphMap;
  iconInactive: keyof typeof Ionicons.glyphMap;
}

const TABS: TabItem[] = [
  {
    id: 'play',
    label: 'Banderas',
    iconActive: 'flag',
    iconInactive: 'flag-outline',
  },
  {
    id: 'capitals',
    label: 'Capitales',
    iconActive: 'business',
    iconInactive: 'business-outline',
  },
  {
    id: 'atlas',
    label: 'Atlas',
    iconActive: 'earth',
    iconInactive: 'earth-outline',
  },
  {
    id: 'profile',
    label: 'Perfil',
    iconActive: 'trophy',
    iconInactive: 'trophy-outline',
  },
];

export const AppleTabBar: React.FC<AppleTabBarProps> = ({ currentTab, onTabChange }) => {
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useTheme();

  const handlePress = (tab: TabType) => {
    if (tab !== currentTab) {
      soundService.triggerSelection();
      onTabChange(tab);
    }
  };

  const content = (
    <View style={[styles.tabBarInner, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {TABS.map((tab) => {
        const isActive = currentTab === tab.id;
        return (
          <Pressable
            key={tab.id}
            onPress={() => handlePress(tab.id)}
            style={styles.tabButton}
            hitSlop={8}
          >
            <View style={styles.iconWrap}>
              <Ionicons
                name={isActive ? tab.iconActive : tab.iconInactive}
                size={24}
                color={isActive ? colors.systemBlue : colors.tertiaryLabel}
              />
            </View>
            <Text
              style={[
                styles.tabLabel,
                { color: isActive ? colors.systemBlue : colors.tertiaryLabel },
                isActive && styles.tabLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={[styles.container, { borderTopColor: colors.tabBarBorder }]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={85} tint={isDark ? 'dark' : 'light'} style={styles.blurWrap}>
          {content}
        </BlurView>
      ) : (
        <View style={[styles.solidWrap, { backgroundColor: colors.tabBarBackground }]}>
          {content}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(60, 60, 67, 0.18)',
    zIndex: 100,
  },
  blurWrap: {
    overflow: 'hidden',
  },
  solidWrap: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
  },
  tabBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    minHeight: 56,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  tabLabelActive: {
    fontWeight: '600',
  },
});
