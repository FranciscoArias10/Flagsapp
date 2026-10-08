import { speechService } from '../utils/speechHelper';

export interface VoiceRecognitionEvents {
  onStart?: () => void;
  onSpeechStart?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
  onVolumeChange?: (volume: number) => void;
  onAvailabilityChange?: (available: boolean) => void;
}

export interface StartRecognitionParams {
  lang?: 'es' | 'en';
  contextualStrings?: string[];
}

class VoiceRecognitionService {
  private isListening: boolean = false;
  private shouldKeepListening: boolean = false;
  private currentParams: StartRecognitionParams = {};
  private listeners: VoiceRecognitionEvents = {};
  private nativeModule: any = null;
  private isNativeAvailable: boolean = false;
  private subscriptions: (() => void)[] = [];

  constructor() {
    this.checkNativeAvailability();
  }

  /**
   * Verifica de forma segura si el módulo nativo de reconocimiento de voz está disponible
   * en el entorno actual (disponible en Development Build, no en Expo Go estándar).
   */
  public checkNativeAvailability(): boolean {
    try {
      // Importación dinámica segura para evitar excepciones en Expo Go estándar
      const speechModule = require('expo-speech-recognition');
      if (speechModule && speechModule.ExpoSpeechRecognitionModule) {
        this.nativeModule = speechModule.ExpoSpeechRecognitionModule;
        const available = typeof this.nativeModule.isRecognitionAvailable === 'function'
          ? this.nativeModule.isRecognitionAvailable()
          : true;
        this.isNativeAvailable = Boolean(available);
        return this.isNativeAvailable;
      }
    } catch {
      this.isNativeAvailable = false;
      this.nativeModule = null;
    }
    return false;
  }

  public isAvailable(): boolean {
    return this.isNativeAvailable && Boolean(this.nativeModule);
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public setEventListeners(events: VoiceRecognitionEvents) {
    this.listeners = events;
  }

  /**
   * Solicita permisos de micrófono y reconocimiento de voz nativos.
   */
  public async requestPermissions(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      if (typeof this.nativeModule.requestPermissionsAsync === 'function') {
        const response = await this.nativeModule.requestPermissionsAsync();
        return Boolean(response?.granted);
      }
      return true;
    } catch (e) {
      console.warn('[VoiceService] Error requesting permissions:', e);
      return false;
    }
  }

  /**
   * Inicia la escucha continua y en streaming (interimResults: true).
   */
  public async startListening(params: StartRecognitionParams = {}): Promise<boolean> {
    if (!this.checkNativeAvailability()) {
      this.listeners.onError?.(
        'El reconocimiento de voz nativo en streaming requiere un Development Build (npx expo run:android).'
      );
      return false;
    }

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        this.listeners.onError?.('Permiso de micrófono o reconocimiento de voz denegado.');
        return false;
      }

      this.currentParams = params;
      this.shouldKeepListening = true;

      // Limpiar suscripciones previas si las hubiera
      this.clearNativeSubscriptions();

      // Configurar eventos nativos
      this.setupNativeListeners();

      const langCode = params.lang === 'en' ? 'en-US' : 'es-ES';

      // Parámetros optimizados para velocidad ultra-rápida y streaming sin pausas
      await this.nativeModule.start({
        lang: langCode,
        interimResults: true,
        continuous: true,
        maxAlternatives: 1,
        contextualStrings: params.contextualStrings || [],
        requiresOnDeviceRecognition: false,
        addsPunctuation: false,
      });

      this.isListening = true;
      this.listeners.onStart?.();
      return true;
    } catch (err: any) {
      console.warn('[VoiceService] Error starting recognition:', err);
      this.isListening = false;
      this.listeners.onError?.(err?.message || 'Error al iniciar reconocimiento de voz');
      return false;
    }
  }

  /**
   * Detiene el reconocimiento de voz activo.
   */
  public async stopListening(): Promise<void> {
    this.shouldKeepListening = false;
    this.isListening = false;

    if (!this.nativeModule) return;

    try {
      if (typeof this.nativeModule.stop === 'function') {
        await this.nativeModule.stop();
      }
    } catch {
      // Ignorar errores al detener
    } finally {
      this.clearNativeSubscriptions();
      this.listeners.onEnd?.();
    }
  }

  /**
   * Cancela inmediatamente la sesión en curso sin esperar transcripción final.
   */
  public async abortListening(): Promise<void> {
    this.shouldKeepListening = false;
    this.isListening = false;

    if (!this.nativeModule) return;

    try {
      if (typeof this.nativeModule.abort === 'function') {
        await this.nativeModule.abort();
      } else if (typeof this.nativeModule.stop === 'function') {
        await this.nativeModule.stop();
      }
    } catch {
      // Ignorar
    } finally {
      this.clearNativeSubscriptions();
      this.listeners.onEnd?.();
    }
  }

  private setupNativeListeners() {
    if (!this.nativeModule) return;

    try {
      // Escucha de resultados en streaming
      if (typeof this.nativeModule.addListener === 'function') {
        const subResult = this.nativeModule.addListener('result', (event: any) => {
          const results = event?.results;
          if (Array.isArray(results) && results.length > 0) {
            const transcript = results[0]?.transcript || '';
            const isFinal = Boolean(event.isFinal);
            this.listeners.onResult?.(transcript, isFinal);
          }
        });

        // Evento de inicio de detección de voz -> Barge-in para detener el locutor
        const subSpeechStart = this.nativeModule.addListener('speechstart', () => {
          // Barge-in instantáneo: cortar la voz del locutor para evitar acople
          speechService.stop();
          this.listeners.onSpeechStart?.();
        });

        // Detección de sonido (primer decibelio detectado)
        const subSoundStart = this.nativeModule.addListener('soundstart', () => {
          speechService.stop();
        });

        // Medidor de volumen para feedback visual de onda sonora
        const subVolume = this.nativeModule.addListener('volumechange', (event: any) => {
          const val = typeof event?.value === 'number' ? event.value : 0;
          this.listeners.onVolumeChange?.(val);
        });

        const subError = this.nativeModule.addListener('error', (event: any) => {
          const errorType = event?.error;
          // 'no-speech' es común en escucha continua si el usuario no habla de inmediato
          if (errorType !== 'no-speech') {
            this.listeners.onError?.(event?.message || `Error de voz: ${errorType}`);
          }

          // Si debemos mantenernos escuchando en continuo y se detuvo por timeout
          if (this.shouldKeepListening && (errorType === 'no-speech' || errorType === 'speech-timeout')) {
            this.restartIfContinuous();
          }
        });

        const subEnd = this.nativeModule.addListener('end', () => {
          this.isListening = false;
          // Si el sistema cerró la sesión pero el juego sigue activo en modo continuo, reanudar
          if (this.shouldKeepListening) {
            this.restartIfContinuous();
          } else {
            this.listeners.onEnd?.();
          }
        });

        this.subscriptions = [
          () => subResult?.remove?.(),
          () => subSpeechStart?.remove?.(),
          () => subSoundStart?.remove?.(),
          () => subVolume?.remove?.(),
          () => subError?.remove?.(),
          () => subEnd?.remove?.(),
        ];
      }
    } catch (e) {
      console.warn('[VoiceService] Could not setup native listeners:', e);
    }
  }

  private restartIfContinuous() {
    if (!this.shouldKeepListening || !this.nativeModule) return;
    setTimeout(() => {
      if (this.shouldKeepListening && !this.isListening) {
        this.startListening(this.currentParams).catch(() => {});
      }
    }, 150);
  }

  private clearNativeSubscriptions() {
    this.subscriptions.forEach((unsubscribe) => {
      try {
        unsubscribe();
      } catch {}
    });
    this.subscriptions = [];
  }
}

export const voiceRecognitionService = new VoiceRecognitionService();
