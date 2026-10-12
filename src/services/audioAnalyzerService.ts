import { Platform } from 'react-native';

export interface AudioSpectrumData {
  spectrum: number[]; // 5 bandas de frecuencias normalizadas (0.0 a 1.0)
  volume: number; // Porcentaje de volumen (0 a 100)
  hasSignal: boolean; // Verdadero si hay señal audible (> 2%)
  status: 'idle' | 'requesting' | 'active' | 'silent' | 'permission_denied' | 'unsupported' | 'error';
  errorMessage: string | null;
}

type AudioDataListener = (data: AudioSpectrumData) => void;

class AudioAnalyzerService {
  private isAnalyzing: boolean = false;
  private listeners: Set<AudioDataListener> = new Set();
  private currentData: AudioSpectrumData = {
    spectrum: [0, 0, 0, 0, 0],
    volume: 0,
    hasSignal: false,
    status: 'idle',
    errorMessage: null,
  };

  // Referencias exclusivas de Web Audio API
  private mediaStream: any = null;
  private audioContext: any = null;
  private analyserNode: any = null;
  private animationFrameId: number | null = null;
  private sampleIntervalId: any = null;
  private silentSinceTime: number = 0;

  public subscribe(listener: AudioDataListener): () => void {
    this.listeners.add(listener);
    listener(this.currentData);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentData);
      } catch (e) {
        console.warn('[AudioAnalyzer] Error al notificar suscriptor:', e);
      }
    });
  }

  public getData(): AudioSpectrumData {
    return this.currentData;
  }

  /**
   * Inicia la captura del micrófono y el análisis en tiempo real de frecuencias.
   * En Web utiliza Web Audio API (AudioContext + AnalyserNode).
   */
  public async startAnalysis(): Promise<boolean> {
    if (this.isAnalyzing) return true;

    if (Platform.OS !== 'web') {
      // En entorno móvil nativo, el espectro se modula reactivamente mediante updateNativeVolume
      this.isAnalyzing = true;
      this.currentData = {
        spectrum: [0.05, 0.05, 0.05, 0.05, 0.05],
        volume: 0,
        hasSignal: false,
        status: 'active',
        errorMessage: null,
      };
      this.notify();
      return true;
    }

    // Entorno Web: Verificar disponibilidad de getUserMedia y AudioContext
    if (
      typeof window === 'undefined' ||
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      console.warn('[AudioAnalyzer] getUserMedia no está disponible en este navegador.');
      this.currentData = {
        spectrum: [0, 0, 0, 0, 0],
        volume: 0,
        hasSignal: false,
        status: 'unsupported',
        errorMessage: 'Este navegador no admite acceso directo al micrófono.',
      };
      this.notify();
      return false;
    }

    try {
      this.currentData = {
        ...this.currentData,
        status: 'requesting',
        errorMessage: null,
      };
      this.notify();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: true,
        },
      });

      this.mediaStream = stream;

      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('Web AudioContext no soportado');
      }

      this.audioContext = new AudioContextClass();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const sourceNode = this.audioContext.createMediaStreamSource(stream);
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 64; // Produce 32 bins de frecuencia
      analyser.smoothingTimeConstant = 0.55; // Suavizado fluido para visualización
      sourceNode.connect(analyser);
      this.analyserNode = analyser;

      this.isAnalyzing = true;
      this.silentSinceTime = Date.now();

      // Bucle de muestreo ligero a ~25 FPS (cada 40ms) para cero impacto en CPU
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      this.sampleIntervalId = setInterval(() => {
        if (!this.isAnalyzing || !this.analyserNode) return;

        this.analyserNode.getByteFrequencyData(dataArray);

        // Agrupar en 5 bandas representativas del espectro vocal:
        // Banda 0: Graves / Fondo (bins 1-2)
        // Banda 1: Fundamental vocal baja (bins 3-5)
        // Banda 2: Rango vocal medio (bins 6-9)
        // Banda 3: Presencia vocal y formantes (bins 10-15)
        // Banda 4: Agudos y aire (bins 16-24)
        const b0 = this.getAverage(dataArray, 1, 2) / 255;
        const b1 = this.getAverage(dataArray, 3, 5) / 255;
        const b2 = this.getAverage(dataArray, 6, 9) / 255;
        const b3 = this.getAverage(dataArray, 10, 15) / 255;
        const b4 = this.getAverage(dataArray, 16, 24) / 255;

        // Calcular volumen RMS general en porcentaje 0-100
        const totalAvg = (b0 + b1 + b2 + b3 + b4) / 5;
        const volumePercent = Math.min(100, Math.round(totalAvg * 140));
        const hasSignal = volumePercent >= 3;

        const now = Date.now();
        if (hasSignal) {
          this.silentSinceTime = now;
        }

        const isSilentLong = !hasSignal && now - this.silentSinceTime > 2500;

        this.currentData = {
          spectrum: [
            Math.max(0.04, Number(b0.toFixed(2))),
            Math.max(0.04, Number(b1.toFixed(2))),
            Math.max(0.04, Number(b2.toFixed(2))),
            Math.max(0.04, Number(b3.toFixed(2))),
            Math.max(0.04, Number(b4.toFixed(2))),
          ],
          volume: volumePercent,
          hasSignal,
          status: isSilentLong ? 'silent' : 'active',
          errorMessage: isSilentLong
            ? 'Micrófono en silencio (0%). Revisa el volumen de entrada en tu sistema (PipeWire/pavucontrol).'
            : null,
        };
        this.notify();
      }, 40);

      return true;
    } catch (err: any) {
      console.warn('[AudioAnalyzer] Error al solicitar o analizar micrófono:', err);
      const isDenied =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        err?.message?.toLowerCase().includes('permission');

      this.currentData = {
        spectrum: [0, 0, 0, 0, 0],
        volume: 0,
        hasSignal: false,
        status: isDenied ? 'permission_denied' : 'error',
        errorMessage: isDenied
          ? 'Permiso de micrófono denegado. Permite el acceso al micrófono en la barra de tu navegador.'
          : err?.message || 'Error al conectar el micrófono.',
      };
      this.notify();
      this.stopAnalysis();
      return false;
    }
  }

  /**
   * Modula el espectro reactivamente con decibelios nativos (iOS/Android).
   */
  public updateNativeVolume(volumeValue: number) {
    if (Platform.OS === 'web' && this.analyserNode) {
      return; // En web el AnalyserNode real tiene prioridad
    }

    // Normalizar volumen nativo (habitualmente escala 0 a 10 o -2 a 10)
    const normalized = Math.max(0, Math.min(100, Math.round((volumeValue / 10) * 100)));
    const hasSignal = normalized > 3;
    const base = normalized / 100;

    this.currentData = {
      spectrum: [
        Math.max(0.05, Number((base * 0.7).toFixed(2))),
        Math.max(0.05, Number((base * 0.95).toFixed(2))),
        Math.max(0.05, Number((base * 1.0).toFixed(2))),
        Math.max(0.05, Number((base * 0.85).toFixed(2))),
        Math.max(0.05, Number((base * 0.6).toFixed(2))),
      ],
      volume: normalized,
      hasSignal,
      status: hasSignal ? 'active' : 'silent',
      errorMessage: null,
    };
    this.notify();
  }

  /**
   * Detiene el análisis, libera el micrófono y apaga el indicador de grabación del navegador.
   */
  public stopAnalysis() {
    this.isAnalyzing = false;

    if (this.sampleIntervalId) {
      clearInterval(this.sampleIntervalId);
      this.sampleIntervalId = null;
    }

    if (this.mediaStream) {
      try {
        const tracks = this.mediaStream.getTracks();
        tracks.forEach((track: any) => {
          try {
            track.stop();
          } catch {}
        });
      } catch {}
      this.mediaStream = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }

    this.analyserNode = null;

    this.currentData = {
      spectrum: [0.04, 0.04, 0.04, 0.04, 0.04],
      volume: 0,
      hasSignal: false,
      status: 'idle',
      errorMessage: null,
    };
    this.notify();
  }

  private getAverage(array: Uint8Array, start: number, end: number): number {
    let sum = 0;
    let count = 0;
    for (let i = start; i <= end && i < array.length; i++) {
      sum += array[i];
      count++;
    }
    return count > 0 ? sum / count : 0;
  }
}

export const audioAnalyzerService = new AudioAnalyzerService();
