import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

class SpeechService {
  private enabled: boolean = false;

  public setEnabled(value: boolean) {
    this.enabled = value;
    if (!value) {
      this.stop();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public stop() {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      } else {
        Speech.stop();
      }
    } catch {
      // Non-critical
    }
  }

  public speak(text: string, lang: 'es' | 'en' = 'es', options?: Speech.SpeechOptions) {
    if (!this.enabled) return;

    try {
      const languageCode = lang === 'en' ? 'en-US' : 'es-ES';

      // En entorno Web, Chromium requiere un micro-delay de 50ms tras cancel() para no abortar el utterance
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setTimeout(() => {
          if (!this.enabled) return;
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = languageCode;
          utterance.rate = 1.05;
          window.speechSynthesis.speak(utterance);
        }, 50);
        return;
      }

      Speech.stop();
      Speech.speak(text, {
        language: languageCode,
        rate: 1.1, // Ritmo ágil adaptado a la velocidad del quiz
        pitch: 1.0,
        ...options,
      });
    } catch {
      // Non-critical
    }
  }

  public speakCapitalQuestion(countryName: string, lang: 'es' | 'en' = 'es') {
    if (!this.enabled) return;
    const phrase = lang === 'en' ? `Capital of ${countryName}` : `Capital de ${countryName}`;
    this.speak(phrase, lang);
  }

  public speakFlagQuestion(countryName: string, lang: 'es' | 'en' = 'es') {
    if (!this.enabled) return;
    const phrase = lang === 'en' ? `Flag of ${countryName}` : `Bandera de ${countryName}`;
    this.speak(phrase, lang);
  }
}

export const speechService = new SpeechService();
