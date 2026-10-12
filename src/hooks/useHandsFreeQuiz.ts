import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { voiceRecognitionService } from '../services/voiceRecognitionService';
import { audioAnalyzerService, AudioSpectrumData } from '../services/audioAnalyzerService';
import { matchVoiceAnswer, MatchResult } from '../utils/phoneticMatcher';
import { soundService } from '../utils/soundHelper';

export interface UseHandsFreeQuizOptions {
  enabled: boolean;
  targetAnswer: string;
  distractors: string[];
  eliminatedOptions?: string[]; // Opciones eliminadas (por segunda oportunidad / escudo)
  language?: 'es' | 'en';
  isActive: boolean; // Verdadero mientras la ronda esté en curso (no respondida, no resumen)
  onAnswerMatch: (matchedOption: string, isCorrect: boolean) => void;
}

export function useHandsFreeQuiz({
  enabled,
  targetAnswer,
  distractors,
  eliminatedOptions = [],
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
  const [audioData, setAudioData] = useState<AudioSpectrumData>(audioAnalyzerService.getData());

  const matchedFiredRef = useRef(false);
  const targetAnswerRef = useRef(targetAnswer);
  const distractorsRef = useRef(distractors);
  const onAnswerMatchRef = useRef(onAnswerMatch);

  // Excluir de los distractores las opciones ya descartadas en la segunda oportunidad
  const activeDistractors = distractors.filter(
    (d) => !eliminatedOptions?.some((elim) => elim.toLowerCase().trim() === d.toLowerCase().trim())
  );

  targetAnswerRef.current = targetAnswer;
  distractorsRef.current = activeDistractors;
  onAnswerMatchRef.current = onAnswerMatch;

  // Suscripción al espectro de frecuencias en tiempo real
  useEffect(() => {
    const unsubscribe = audioAnalyzerService.subscribe((data) => {
      setAudioData(data);
    });
    return unsubscribe;
  }, []);

  // Verificar disponibilidad del módulo nativo o Web Speech al inicializar
  useEffect(() => {
    const avail = voiceRecognitionService.checkNativeAvailability();
    setIsNativeAvailable(avail);
  }, []);

  // Función para reiniciar el estado de respuesta (usada al cambiar de pregunta o activar Segunda Oportunidad)
  const resetAnswerState = useCallback(() => {
    console.log('[HandsFree] 🔄 Reiniciando detector de voz para nueva oportunidad/pregunta');
    matchedFiredRef.current = false;
    setTranscript('');
    setLastMatch(null);
  }, []);

  // Reiniciar estado de respuesta en cuanto cambia la pregunta o se descarta una opción por Segunda Oportunidad
  useEffect(() => {
    resetAnswerState();
  }, [targetAnswer, eliminatedOptions.length, resetAnswerState]);

  // Manejador de transcripción en streaming e interimResults (< 100ms)
  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    console.log(`[HandsFree] 🎙️ Texto detectado: "${text}" (isFinal: ${isFinal})`);
    if (!text || matchedFiredRef.current) return;
    setTranscript(text);

    // Evaluación ultra-rápida con normalización fonética y prefijos coloquiales
    const match = matchVoiceAnswer(text, targetAnswerRef.current, distractorsRef.current);
    console.log('[HandsFree] 🔍 Rastreo fonético:', {
      texto: text,
      objetivo: targetAnswerRef.current,
      esAcierto: match.isMatch,
      esDistractor: match.isDistractor,
      opcion: match.matchedOption,
      confianza: Math.round(match.confidence * 100) + '%',
    });
    setLastMatch(match);

    if (match.isMatch && match.matchedOption) {
      console.log(`[HandsFree] ✅ ¡COINCIDENCIA EXITOSA! Disparando respuesta: "${match.matchedOption}"`);
      matchedFiredRef.current = true;
      soundService.triggerLightTap();
      onAnswerMatchRef.current(match.matchedOption, true);
    } else if (match.isDistractor && match.matchedOption && isFinal) {
      console.log(`[HandsFree] ❌ Distractor final detectado: "${match.matchedOption}"`);
      matchedFiredRef.current = true;
      onAnswerMatchRef.current(match.matchedOption, false);
    }
  }, []);

  // Función para simular voz en pruebas o en Expo Go
  const simulateVoiceInput = useCallback((spokenText: string) => {
    console.log(`[HandsFree] 🧪 Simulando reconocimiento de voz: "${spokenText}"`);
    matchedFiredRef.current = false;
    handleTranscript(spokenText, true);
  }, [handleTranscript]);

  // Ciclo de vida y listeners del servicio de voz
  useEffect(() => {
    if (!enabled || !isActive || !isNativeAvailable) {
      if (voiceRecognitionService.getIsListening()) {
        voiceRecognitionService.stopListening().catch(() => {});
      }
      setIsListening(false);
      setVolume(0);
      return;
    }

    voiceRecognitionService.setEventListeners({
      onStart: () => {
        console.log('[HandsFree] 🟢 Micrófono nativo abierto y escuchando...');
        setIsListening(true);
        setErrorMessage(null);
      },
      onSpeechStart: () => {
        console.log('[HandsFree] 🗣️ Voz humana detectada (Barge-in)');
      },
      onResult: (text, isFinal) => {
        handleTranscript(text, isFinal);
      },
      onVolumeChange: (vol) => {
        setVolume(vol);
      },
      onError: (err) => {
        console.log('[HandsFree] 🔴 Error de reconocimiento:', err);
        setErrorMessage(err);
      },
      onEnd: () => {
        console.log('[HandsFree] ⚪ Reconocimiento finalizado');
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
        console.log('[HandsFree] Inicio de escucha:', started ? 'Exitoso' : 'No iniciado');
      })
      .catch((e) => {
        console.warn('[useHandsFreeQuiz] Error starting voice recognition:', e);
        setIsListening(false);
      });

    return () => {
      voiceRecognitionService.stopListening().catch(() => {});
    };
  }, [enabled, isActive, isNativeAvailable, targetAnswer, language, handleTranscript]);

  const requestMicAccess = useCallback(async () => {
    try {
      const ok = await audioAnalyzerService.startAnalysis();
      if (ok && Platform.OS === 'web') {
        const allContextStrings = [targetAnswerRef.current, ...distractorsRef.current].filter(Boolean);
        await voiceRecognitionService.startListening({
          lang: language,
          contextualStrings: allContextStrings,
        });
      }
    } catch (e) {
      console.warn('[HandsFree] Error al solicitar acceso al micrófono:', e);
    }
  }, [language]);

  return {
    isListening,
    transcript,
    volume: Math.max(volume, audioData.volume),
    spectrum: audioData.spectrum,
    hasAudioSignal: audioData.hasSignal,
    micStatus: audioData.status,
    micErrorMessage: audioData.errorMessage || errorMessage,
    lastMatch,
    isNativeAvailable,
    errorMessage,
    simulateVoiceInput,
    resetAnswerState,
    requestMicAccess,
  };
}
