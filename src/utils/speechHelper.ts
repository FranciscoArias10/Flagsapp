import * as Speech from 'expo-speech';

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
      Speech.stop();
    } catch {
      // Non-critical
    }
  }

  public speak(text: string, lang: 'es' | 'en' = 'es', options?: Speech.SpeechOptions) {
    if (!this.enabled) return;

    try {
      Speech.stop();
      const languageCode = lang === 'en' ? 'en-US' : 'es-ES';
      Speech.speak(text, {
        language: languageCode,
        rate: 1.1, // Quick, agile pronunciation rhythm suited for quiz
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
