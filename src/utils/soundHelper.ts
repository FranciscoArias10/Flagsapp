import * as Haptics from 'expo-haptics';

class SoundService {
  private hapticsEnabled: boolean = true;
  private soundEnabled: boolean = true;

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
