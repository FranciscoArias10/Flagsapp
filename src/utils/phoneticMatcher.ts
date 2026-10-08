/**
 * Normalizador fonético y motor de coincidencia ultra-rápida (< 100ms)
 * para reconocimiento de voz en tiempo real en Flags++.
 */

// Prefijos y palabras de relleno coloquiales que los jugadores suelen decir al hablar
const SPANISH_STOP_PREFIXES = [
  'la capital es',
  'el pais es',
  'la respuesta es',
  'yo digo que es',
  'creo que es',
  'creo que',
  'debe ser',
  'yo creo que',
  'para mi que es',
  'para mi es',
  'me parece que es',
  'seguro es',
  'sin duda es',
  'la capital',
  'el pais',
  'es la',
  'es el',
  'es',
];

const ENGLISH_STOP_PREFIXES = [
  'the capital is',
  'the country is',
  'the answer is',
  'i think it is',
  'i think its',
  'i think it',
  'i think',
  'it must be',
  'it is',
  'its',
  'it could be',
  'the capital',
  'is',
];

// Alias y sinónimos comunes para capitales con nombres compuestos o abreviados
const COMMON_CAPITAL_ALIASES: Record<string, string[]> = {
  'washington d.c.': ['washington', 'washington dc', 'dc'],
  'washington dc': ['washington', 'dc'],
  'ciudad de mexico': ['mexico', 'cdmx'],
  'mexico city': ['mexico', 'cdmx'],
  'ciudad de guatemala': ['guatemala'],
  'guatemala city': ['guatemala'],
  'ciudad de panama': ['panama'],
  'panama city': ['panama'],
  'ciudad del vaticano': ['vaticano'],
  'vatican city': ['vatican'],
  'reikiavik': ['reykjavik'],
  'reykjavik': ['reikiavik'],
  'nursultan': ['astana'],
  'astana': ['nursultan'],
};

/**
 * Normaliza una cadena de texto eliminando tildes, signos, mayúsculas y espacios duplicados.
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos/diacríticos
    .replace(/[^a-z0-9\s]/g, ' ') // Reemplazar caracteres especiales y puntuación por espacio
    .replace(/\s+/g, ' ') // Colapsar espacios
    .trim();
}

/**
 * Elimina prefijos comunes de voz (ej: "es quito" -> "quito", "creo que es bogotá" -> "bogota").
 */
export function stripVoicePrefixes(text: string): string {
  let cleaned = normalizeText(text);

  const allPrefixes = [...SPANISH_STOP_PREFIXES, ...ENGLISH_STOP_PREFIXES];

  for (const prefix of allPrefixes) {
    if (cleaned.startsWith(prefix + ' ')) {
      cleaned = cleaned.slice(prefix.length).trim();
      break;
    }
  }

  return cleaned;
}

/**
 * Calcula la distancia de Levenshtein entre dos cadenas cortas.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // sustitución
          matrix[i][j - 1] + 1, // inserción
          matrix[i - 1][j] + 1 // eliminación
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calcula la similitud relativa entre 0 y 1 entre dos cadenas.
 */
export function stringSimilarity(a: string, b: string): number {
  const normA = normalizeText(a);
  const normB = normalizeText(b);

  if (normA === normB) return 1.0;
  if (!normA || !normB) return 0.0;

  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen === 0) return 1.0;

  const dist = levenshteinDistance(normA, normB);
  return Math.max(0, 1 - dist / maxLen);
}

export interface MatchResult {
  isMatch: boolean;
  isDistractor: boolean;
  matchedOption?: string;
  confidence: number;
}

/**
 * Valida un transcript de voz en tiempo real contra la respuesta correcta y distractores.
 * Diseñado para responder en < 100ms durante la emisión de resultados parciales (interimResults).
 */
export function matchVoiceAnswer(
  spokenTranscript: string,
  targetAnswer: string,
  distractors: string[] = []
): MatchResult {
  if (!spokenTranscript || !targetAnswer) {
    return { isMatch: false, isDistractor: false, confidence: 0 };
  }

  const rawSpokenNorm = normalizeText(spokenTranscript);
  const cleanedSpoken = stripVoicePrefixes(spokenTranscript);
  const normTarget = normalizeText(targetAnswer);

  if (!rawSpokenNorm) {
    return { isMatch: false, isDistractor: false, confidence: 0 };
  }

  // 1. Coincidencia exacta directa o con prefijos limpios
  if (rawSpokenNorm === normTarget || cleanedSpoken === normTarget) {
    return {
      isMatch: true,
      isDistractor: false,
      matchedOption: targetAnswer,
      confidence: 1.0,
    };
  }

  // 2. Comprobación de alias conocidos (ej. 'Washington D.C.' vs 'Washington')
  const aliases = COMMON_CAPITAL_ALIASES[normTarget] || [];
  for (const alias of aliases) {
    const normAlias = normalizeText(alias);
    if (rawSpokenNorm === normAlias || cleanedSpoken === normAlias) {
      return {
        isMatch: true,
        isDistractor: false,
        matchedOption: targetAnswer,
        confidence: 0.98,
      };
    }
  }

  // 3. Contención de frase completa o palabras clave
  // Si el usuario dijo "Para mi es Quito definitivamente", busca si contiene el target exacto
  const targetWords = normTarget.split(' ').filter(Boolean);
  const spokenWords = cleanedSpoken.split(' ').filter(Boolean);

  // Si el target es una sola palabra (ej: 'Quito') y aparece en las palabras dichas
  if (targetWords.length === 1 && spokenWords.includes(normTarget)) {
    return {
      isMatch: true,
      isDistractor: false,
      matchedOption: targetAnswer,
      confidence: 0.95,
    };
  }

  // Si el target son varias palabras (ej: 'San José' o 'Buenos Aires')
  if (targetWords.length > 1 && cleanedSpoken.includes(normTarget)) {
    return {
      isMatch: true,
      isDistractor: false,
      matchedOption: targetAnswer,
      confidence: 0.95,
    };
  }

  // 4. Comparación Difusa (Fuzzy Matching con Levenshtein)
  // Compara la frase limpia completa con el target
  const fullSimilarity = stringSimilarity(cleanedSpoken, normTarget);
  if (fullSimilarity >= 0.82) {
    return {
      isMatch: true,
      isDistractor: false,
      matchedOption: targetAnswer,
      confidence: fullSimilarity,
    };
  }

  // Compara palabra por palabra dicha contra el target
  for (const word of spokenWords) {
    if (word.length >= 3) {
      const wordSim = stringSimilarity(word, normTarget);
      // Tolerancia: palabras cortas (3-4 letras) requieren >= 0.8, palabras largas >= 0.78
      const threshold = normTarget.length <= 4 ? 0.8 : 0.78;
      if (wordSim >= threshold) {
        return {
          isMatch: true,
          isDistractor: false,
          matchedOption: targetAnswer,
          confidence: wordSim,
        };
      }
    }
  }

  // 5. Comprobación contra distractores (para saber si el jugador dijo una opción errónea)
  for (const distractor of distractors) {
    const normDist = normalizeText(distractor);
    if (!normDist) continue;

    if (rawSpokenNorm === normDist || cleanedSpoken === normDist || spokenWords.includes(normDist)) {
      return {
        isMatch: false,
        isDistractor: true,
        matchedOption: distractor,
        confidence: 0.95,
      };
    }

    const distSim = stringSimilarity(cleanedSpoken, normDist);
    if (distSim >= 0.82) {
      return {
        isMatch: false,
        isDistractor: true,
        matchedOption: distractor,
        confidence: distSim,
      };
    }
  }

  return { isMatch: false, isDistractor: false, confidence: 0 };
}
