export type Continent = 'América' | 'Europa' | 'Asia' | 'África' | 'Oceanía';

export interface Country {
  code: string; // ISO 3166-1 alpha-2 lowercase (e.g. 'es', 'jp')
  name: string; // Spanish name
  capital: string; // Capital city
  continent: Continent;
  flagEmoji: string;
  population: string;
  fact: string;
  difficulty: 1 | 2 | 3; // 1 = Common, 2 = Intermediate, 3 = Expert
}

export type QuizType = 'flag_to_name' | 'country_to_capital' | 'blitz';
export type BlitzDifficulty = 'easy' | 'medium' | 'hard';

export interface QuizQuestion {
  id: string;
  targetCountry: Country;
  options: Country[];
  correctOptionIndex: number;
  questionType: QuizType;
}

export interface QuizResult {
  score: number;
  totalQuestions: number;
  xpEarned: number;
  accuracy: number;
  highestStreak: number;
  stars: number; // 1, 2, or 3
  timeSpentSeconds?: number;
}

export interface AnswerReviewItem {
  id: string;
  flagEmoji: string;
  countryName: string;
  countryCode?: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  fact?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // Ionicons name
  color: string;
  unlocked: boolean;
  unlockedAt?: string;
  targetCount: number;
  currentCount: number;
}

export interface UserStats {
  username?: string;
  avatar?: string;
  favoriteCountryCode?: string;
  xp: number;
  level: number;
  title: string;
  streak: number;
  bestStreak: number;
  gamesPlayed: number;
  correctAnswers: number;
  totalAnswers: number;
  continentProgress: Record<string, { correct: number; total: number; stars: number }>;
  capitalsProgress?: Record<string, { correct: number; total: number; stars: number; bestScore?: number }>;
  unlockedAchievements: string[];
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  fastAnswerOpportunityEnabled?: boolean;
  themePreference?: ThemePreference;
  languagePreference?: LanguagePreference;
}

export type ThemePreference = 'system' | 'light' | 'dark';
export type SupportedLanguage = 'es' | 'en';
export type LanguagePreference = 'system' | 'es' | 'en';

export type TabType = 'play' | 'capitals' | 'atlas' | 'profile';
