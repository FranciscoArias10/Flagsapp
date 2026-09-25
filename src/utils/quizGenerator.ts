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

  const shuffledTargets = shuffleArray(eligibleCountries).slice(0, count);

  return shuffledTargets.map((target, idx) => {
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
  return baseScore + streakBonus + perfectBonus + timeBonus;
};
