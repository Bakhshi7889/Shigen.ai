export type HapticFeedbackType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

const patterns: Record<HapticFeedbackType, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 40,
  success: [10, 60, 20],
  warning: [30, 40, 30],
  error: [50, 30, 50],
};

/**
 * Triggers haptic feedback on supported devices.
 * @param type The type of feedback to trigger. Corresponds to a specific vibration pattern.
 */
export const triggerHapticFeedback = (type: HapticFeedbackType = 'light') => {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    try {
      window.navigator.vibrate(patterns[type]);
    } catch (e) {
      console.warn("Could not trigger haptic feedback.", e);
    }
  }
};
