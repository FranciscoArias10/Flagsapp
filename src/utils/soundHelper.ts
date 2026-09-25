import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

class SoundService {
  private hapticsEnabled: boolean = true;
  private soundEnabled: boolean = true;
  private correctSound: Audio.Sound | null = null;
  private wrongSound: Audio.Sound | null = null;
  private victorySound: Audio.Sound | null = null;

  constructor() {
    this.initAudio();
  }

  private async initAudio() {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
    } catch {
      // Audio mode fallback
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
  }

  public triggerError() {
    if (this.hapticsEnabled) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
    }
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
  }
}

export const soundService = new SoundService();
