import { Country, QuizQuestion, QuizType, Continent } from '../types';
import { COUNTRIES } from '../data/countries';

const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Memory of recently asked countries per continent to ensure zero repetitions across sessions
const askedHistoryByPool: Map<string, Set<string>> = new Map();

export const resetAskedHistory = (poolKey?: string) => {
  if (poolKey) {
    askedHistoryByPool.delete(poolKey);
  } else {
    askedHistoryByPool.clear();
  }
};

export const generateQuizQuestions = (
  count: number = 10,
  continent?: Continent | 'Mundo',
  quizType: QuizType = 'flag_to_name'
): QuizQuestion[] => {
  let eligibleCountries = COUNTRIES;
  if (continent && continent !== 'Mundo') {
    eligibleCountries = COUNTRIES.filter((c) => c.continent === continent);
  }

  // Fallback if not enough countries in continent
  if (eligibleCountries.length < 4) {
    eligibleCountries = COUNTRIES;
  }

  const poolKey = continent || 'Mundo';
  if (!askedHistoryByPool.has(poolKey)) {
    askedHistoryByPool.set(poolKey, new Set<string>());
  }
  const askedSet = askedHistoryByPool.get(poolKey)!;

  // Max number of questions cannot exceed available pool
  const effectiveCount = Math.min(Math.max(1, count), eligibleCountries.length);

  // Divide into unseen and seen countries for non-repeating deck
  const unseen = eligibleCountries.filter((c) => !askedSet.has(c.code));
  let targets: Country[] = [];

  if (unseen.length >= effectiveCount) {
    // We have enough unseen countries to satisfy this round without repetition
    targets = shuffleArray(unseen).slice(0, effectiveCount);
  } else {
    // Take all remaining unseen countries first
    targets = [...shuffleArray(unseen)];
    const needed = effectiveCount - targets.length;

    // Reset asked memory for this pool because a full cycle has completed
    askedSet.clear();

    // Re-pick the rest from countries not already picked in this round
    const remainingPool = eligibleCountries.filter((c) => !targets.some((t) => t.code === c.code));
    const extraTargets = shuffleArray(remainingPool).slice(0, needed);
    targets.push(...extraTargets);
  }

  // Register all picked targets into the asked history
  targets.forEach((t) => askedSet.add(t.code));

  return targets.map((target, idx) => {
    // Pick 3 distractors from same pool if possible, or all countries
    const otherCountries = (
      eligibleCountries.length >= 4 ? eligibleCountries : COUNTRIES
    ).filter((c) => c.code !== target.code);

    const shuffledOthers = shuffleArray(otherCountries);
    const distractors = shuffledOthers.slice(0, 3);

    const options = shuffleArray([target, ...distractors]);
    const correctIndex = options.findIndex((c) => c.code === target.code);

    return {
      id: `q_${idx}_${target.code}`,
      targetCountry: target,
      options,
      correctOptionIndex: correctIndex,
      questionType: quizType,
    };
  });
};

export const calculateStars = (score: number, total: number): number => {
  if (total <= 0) return 0;
  const percentage = (score / total) * 100;
  if (percentage >= 90) return 3;
  if (percentage >= 70) return 2;
  if (percentage >= 50) return 1;
  return 0;
};

export const calculateXpEarned = (
  score: number,
  total: number,
  highestStreak: number,
  timeBonus: number = 0
): number => {
  const baseScore = score * 25;
  const streakBonus = highestStreak * 6;
  const perfectBonus = score === total && total >= 5 ? 60 : 0;
  // Scaled marathon bonus for longer sessions
  const marathonBonus = total >= 100 ? 250 : total >= 50 ? 150 : total >= 20 ? 50 : 0;
  return baseScore + streakBonus + perfectBonus + marathonBonus + timeBonus;
};
