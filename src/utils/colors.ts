// Base Apple Light Theme
export const LightColors = {
  // Apple System Tint Colors
  systemBlue: '#007AFF',
  systemGreen: '#34C759',
  systemIndigo: '#5856D6',
  systemOrange: '#FF9500',
  systemPink: '#FF2D55',
  systemPurple: '#AF52DE',
  systemRed: '#FF3B30',
  systemTeal: '#30B0C7',
  systemYellow: '#FFCC00',
  systemMint: '#00C7BE',
  systemCyan: '#32ADE6',

  // Backgrounds
  systemBackground: '#F2F2F7',
  secondarySystemBackground: '#FFFFFF',
  tertiarySystemBackground: '#E5E5EA',
  groupedBackground: '#F2F2F7',
  cardBackground: '#FFFFFF',
  modalBackground: '#FFFFFF',
  surface: '#F2F2F7',
  inputBackground: '#FFFFFF',

  // Fills & Translucency
  systemFill: 'rgba(120, 120, 128, 0.2)',
  secondarySystemFill: 'rgba(120, 120, 128, 0.12)',
  tertiarySystemFill: 'rgba(118, 118, 128, 0.08)',
  quaternarySystemFill: 'rgba(116, 116, 128, 0.05)',

  // Labels & Text
  label: '#000000',
  secondaryLabel: '#6C6C70',
  tertiaryLabel: '#8E8E93',
  quaternaryLabel: '#AEAEB2',

  // Separators & Borders
  separator: 'rgba(60, 60, 67, 0.29)',
  opaqueSeparator: '#C6C6C8',
  cardBorder: 'rgba(0, 0, 0, 0.04)',
  tabBarBackground: 'rgba(255, 255, 255, 0.94)',
  tabBarBorder: 'rgba(60, 60, 67, 0.18)',

  // Gamification & Badges
  goldStar: '#FFB800',
  streakFire: '#FF5722',
  xpPurple: '#7E57C2',
  heartRed: '#FF3B30',
  correctCardBackground: '#EAF8EE',
  correctText: '#248A3D',
  wrongCardBackground: '#FDEEEE',
  wrongText: '#D70015',

  // Shadows
  cardShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  cardShadowLarge: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  buttonShadow: {
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
};

// Apple Pure Dark Theme (OLED Friendly)
export const DarkColors: typeof LightColors = {
  // Apple System Tint Colors (Brightened for dark contrast)
  systemBlue: '#0A84FF',
  systemGreen: '#30D158',
  systemIndigo: '#5E5CE6',
  systemOrange: '#FF9F0A',
  systemPink: '#FF375F',
  systemPurple: '#BF5AF2',
  systemRed: '#FF453A',
  systemTeal: '#40C8E0',
  systemYellow: '#FFD60A',
  systemMint: '#63E6E2',
  systemCyan: '#64D2FF',

  // Backgrounds (True Black & Deep Elevated Greys)
  systemBackground: '#000000',
  secondarySystemBackground: '#1C1C1E',
  tertiarySystemBackground: '#2C2C2E',
  groupedBackground: '#000000',
  cardBackground: '#1C1C1E',
  modalBackground: '#1C1C1E',
  surface: '#2C2C2E',
  inputBackground: '#1C1C1E',

  // Fills & Translucency
  systemFill: 'rgba(120, 120, 128, 0.36)',
  secondarySystemFill: 'rgba(120, 120, 128, 0.32)',
  tertiarySystemFill: 'rgba(118, 118, 128, 0.24)',
  quaternarySystemFill: 'rgba(118, 118, 128, 0.18)',

  // Labels & Text
  label: '#FFFFFF',
  secondaryLabel: '#8E8E93',
  tertiaryLabel: '#636366',
  quaternaryLabel: '#48484A',

  // Separators & Borders
  separator: 'rgba(84, 84, 88, 0.65)',
  opaqueSeparator: '#38383A',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  tabBarBackground: 'rgba(28, 28, 30, 0.94)',
  tabBarBorder: 'rgba(255, 255, 255, 0.12)',

  // Gamification & Badges
  goldStar: '#FFD60A',
  streakFire: '#FF6F43',
  xpPurple: '#9D7BE0',
  heartRed: '#FF453A',
  correctCardBackground: 'rgba(48, 209, 88, 0.18)',
  correctText: '#30D158',
  wrongCardBackground: 'rgba(255, 69, 58, 0.18)',
  wrongText: '#FF453A',

  // Shadows (Slightly deeper for dark contrast)
  cardShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 3,
  },
  cardShadowLarge: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 6,
  },
  buttonShadow: {
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
};

export type ThemeColors = typeof LightColors;

export const getThemeColors = (isDark: boolean): ThemeColors =>
  isDark ? DarkColors : LightColors;

// Backwards-compatible default IOSColors
export const IOSColors = {
  ...LightColors,
  darkSystemBackground: '#000000',
  darkSecondaryBackground: '#1C1C1E',
  darkTertiaryBackground: '#2C2C2E',
};
