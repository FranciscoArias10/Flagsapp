import * as Haptics from 'expo-haptics';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';

export type SoundKey = 'correct' | 'error' | 'tap' | 'streak' | 'shield' | 'celebration' | 'timer_tick';

const SOUND_ASSETS: Record<SoundKey, any> = {
  correct: require('../../assets/sounds/correct.wav'),
  error: require('../../assets/sounds/error.wav'),
  tap: require('../../assets/sounds/tap.wav'),
  streak: require('../../assets/sounds/streak.wav'),
  shield: require('../../assets/sounds/shield.wav'),
  celebration: require('../../assets/sounds/celebration.wav'),
  timer_tick: require('../../assets/sounds/timer_tick.wav'),
};

const DEFAULT_VOLUMES: Record<SoundKey, number> = {
  correct: 0.7,
  error: 0.6,
  tap: 0.25,
  streak: 0.8,
  shield: 0.75,
  celebration: 0.85,
  timer_tick: 0.35,
};

class SoundService {
  private hapticsEnabled: boolean = true;
  private soundEnabled: boolean = true;
  private players: Partial<Record<SoundKey, AudioPlayer>> = {};
  private audioModeConfigured: boolean = false;

  constructor() {
    this.initAudioMode();
  }

  private async initAudioMode() {
    if (this.audioModeConfigured) return;
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'mixWithOthers',
        shouldPlayInBackground: false,
      });
      this.audioModeConfigured = true;
    } catch {
      // Non-critical if audio session configuration fails
    }
  }

  private getPlayer(key: SoundKey): AudioPlayer | null {
    if (!this.soundEnabled) return null;

    try {
      if (!this.players[key]) {
        const asset = SOUND_ASSETS[key];
        if (!asset) return null;

        const player = createAudioPlayer(asset);
        player.volume = DEFAULT_VOLUMES[key] ?? 0.6;
        this.players[key] = player;
      }
      return this.players[key] ?? null;
    } catch {
      return null;
    }
  }

  public async playSound(key: SoundKey, customVolume?: number) {
    if (!this.soundEnabled) return;

    try {
      this.initAudioMode();
      const player = this.getPlayer(key);
      if (!player) return;

      if (typeof customVolume === 'number') {
        player.volume = Math.max(0, Math.min(1, customVolume));
      }

      await player.seekTo(0);
      player.play();
    } catch {
      // Silently fail on audio error to not disturb gameplay
    }
  }

  public setPreferences(sound: boolean, haptics: boolean) {
    this.soundEnabled = sound;
    this.hapticsEnabled = haptics;
  }

  // Haptic feedback methods (iOS Feel)
  public triggerLightTap() {
    if (this.hapticsEnabled) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
  }

  public triggerMediumTap() {
    if (this.hapticsEnabled) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }
  }

  public triggerHeavyTap() {
    if (this.hapticsEnabled) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch {}
    }
  }

  public triggerSelection() {
    if (this.hapticsEnabled) {
      try {
        Haptics.selectionAsync();
      } catch {}
    }
  }

  public triggerSuccess() {
    if (this.hapticsEnabled) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }
    this.playSound('correct');
  }

  public triggerError() {
    if (this.hapticsEnabled) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
    }
    this.playSound('error');
  }

  public triggerStreak() {
    if (this.hapticsEnabled) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }
    this.playSound('streak');
  }

  public triggerShield() {
    if (this.hapticsEnabled) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch {}
    }
    this.playSound('shield');
  }

  public triggerCountdownTick() {
    if (this.hapticsEnabled) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    this.playSound('timer_tick');
  }

  public triggerCelebration() {
    if (this.hapticsEnabled) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }, 150);
      } catch {}
    }
    this.playSound('celebration');
  }
}

export const soundService = new SoundService();

