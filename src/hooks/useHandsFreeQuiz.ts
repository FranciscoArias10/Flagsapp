import { useState, useEffect, useRef, useCallback } from 'react';
import { voiceRecognitionService } from '../services/voiceRecognitionService';
import { matchVoiceAnswer, MatchResult } from '../utils/phoneticMatcher';
import { soundService } from '../utils/soundHelper';

export interface UseHandsFreeQuizOptions {
  enabled: boolean;
  targetAnswer: string;
  distractors: string[];
  language?: 'es' | 'en';
  isActive: boolean; // Verdadero mientras la ronda esté en curso (no respondida, no resumen)
  onAnswerMatch: (matchedOption: string, isCorrect: boolean) => void;
}

export function useHandsFreeQuiz({
  enabled,
  targetAnswer,
  distractors,
  language = 'es',
  isActive,
  onAnswerMatch,
}: UseHandsFreeQuizOptions) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [volume, setVolume] = useState(0);
  const [lastMatch, setLastMatch] = useState<MatchResult | null>(null);
  const [isNativeAvailable, setIsNativeAvailable] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const matchedFiredRef = useRef(false);
  const targetAnswerRef = useRef(targetAnswer);
  const distractorsRef = useRef(distractors);
  const onAnswerMatchRef = useRef(onAnswerMatch);

  targetAnswerRef.current = targetAnswer;
  distractorsRef.current = distractors;
  onAnswerMatchRef.current = onAnswerMatch;

  // Verificar disponibilidad del módulo nativo al inicializar
  useEffect(() => {
    const avail = voiceRecognitionService.checkNativeAvailability();
    setIsNativeAvailable(avail);
  }, []);

  // Reiniciar estado de respuesta en cuanto cambia la pregunta o targetAnswer
  useEffect(() => {
    matchedFiredRef.current = false;
    setTranscript('');
    setLastMatch(null);
  }, [targetAnswer]);

  // Manejador de transcripción en streaming e interimResults (< 100ms)
  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    if (!text || matchedFiredRef.current) return;
    setTranscript(text);

    // Evaluación ultra-rápida con normalización fonética y prefijos coloquiales
    const match = matchVoiceAnswer(text, targetAnswerRef.current, distractorsRef.current);
    setLastMatch(match);

    if (match.isMatch && match.matchedOption) {
      matchedFiredRef.current = true;
      soundService.triggerLightTap();
      onAnswerMatchRef.current(match.matchedOption, true);
    } else if (match.isDistractor && match.matchedOption && isFinal) {
      // Si el jugador pronunció claramente un distractor erróneo al finalizar
      matchedFiredRef.current = true;
      onAnswerMatchRef.current(match.matchedOption, false);
    }
  }, []);

  // Ciclo de vida y listeners del servicio de voz
  useEffect(() => {
    if (!enabled || !isActive) {
      if (voiceRecognitionService.getIsListening()) {
        voiceRecognitionService.stopListening().catch(() => {});
      }
      setIsListening(false);
      setVolume(0);
      return;
    }

    voiceRecognitionService.setEventListeners({
      onStart: () => {
        setIsListening(true);
        setErrorMessage(null);
      },
      onSpeechStart: () => {
        // El barge-in ya fue ejecutado en el servicio (silencia el locutor)
      },
      onResult: (text, isFinal) => {
        handleTranscript(text, isFinal);
      },
      onVolumeChange: (vol) => {
        setVolume(vol);
      },
      onError: (err) => {
        setErrorMessage(err);
      },
      onEnd: () => {
        setIsListening(false);
        setVolume(0);
      },
    });

    // Iniciar con biasing contextual de la pregunta (target + distractores) para máxima precisión nativa
    const allContextStrings = [targetAnswer, ...distractors].filter(Boolean);
    voiceRecognitionService
      .startListening({
        lang: language,
        contextualStrings: allContextStrings,
      })
      .then((started) => {
        setIsListening(started);
      })
      .catch((e) => {
        console.warn('[useHandsFreeQuiz] Error starting voice recognition:', e);
        setIsListening(false);
      });

    return () => {
      voiceRecognitionService.stopListening().catch(() => {});
    };
  }, [enabled, isActive, targetAnswer, language, handleTranscript]);

  return {
    isListening,
    transcript,
    volume,
    lastMatch,
    isNativeAvailable,
    errorMessage,
  };
}
