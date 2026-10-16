import type { UserPreferences } from '@/core/types';
import { detectTimezone } from './time';

export function defaultPreferences(): UserPreferences {
  return {
    difficulty: 'adaptive',
    dailyQuestCount: 5,
    activePaths: ['vitality', 'intelligence', 'discipline'],
    trainingIntensity: 'moderate',
    dailyMinutes: 45,
    fitnessLevel: 'new',
    techLevel: 'new',
    restDays: [0],
    reducedMotion: false,
    accent: 'violet',
    surface: 'midnight',
    remindersEnabled: false,
    reminderTime: '08:00',
    soundEnabled: true,
  };
}

export function resolveTimezone(tz?: string): string {
  return tz && tz.length > 0 ? tz : detectTimezone();
}
