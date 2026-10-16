import type { WorkoutSession } from '@/core/types';

export interface WorkoutTemplateExercise {
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  /** Coaching cue shown during the session. */
  cue: string;
  /** Safer/easier alternative when the primary movement is out of reach. */
  substitute?: string;
}

export interface WorkoutTemplate {
  id: string;
  title: string;
  summary: string;
  focus: string[];
  intensity: WorkoutSession['intensity'];
  minutes: number;
  level: 'beginner' | 'intermediate';
  exercises: WorkoutTemplateExercise[];
  safety: string;
}

export const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'w-full-body-foundation',
    title: 'Full-Body Foundation',
    summary: 'The default beginner session: push, squat, brace, hinge.',
    focus: ['strength', 'endurance'],
    intensity: 'moderate',
    minutes: 30,
    level: 'beginner',
    exercises: [
      { name: 'Wall push-ups', sets: 3, reps: '8–12', restSeconds: 45, cue: 'Ribs down, body in one line.', substitute: 'Incline push-ups if 12 feels easy' },
      { name: 'Bodyweight squats', sets: 3, reps: '10–15', restSeconds: 60, cue: '3 s down, pause at the bottom.' },
      { name: 'Forearm plank', sets: 3, reps: '30–45 s', restSeconds: 45, cue: 'Squeeze glutes; breathe through the nose.' },
      { name: 'Glute bridges', sets: 3, reps: '12', restSeconds: 45, cue: 'Drive through heels, hold 1 s on top.' },
      { name: 'Cat–cow', sets: 2, reps: '10', restSeconds: 30, cue: 'Move one vertebra at a time.' },
    ],
    safety: 'Stop any movement that produces sharp pain. Mild effort is expected; joint pain is not.',
  },
  {
    id: 'w-push-progression',
    title: 'Push Progression Day',
    summary: 'Build pressing strength from incline work toward harder variations.',
    focus: ['strength'],
    intensity: 'moderate',
    minutes: 25,
    level: 'beginner',
    exercises: [
      { name: 'Incline push-ups', sets: 4, reps: '5–10', restSeconds: 75, cue: 'Chest to the surface, elbows at 45°.' },
      { name: 'Pike push-up (slow negative)', sets: 3, reps: '5', restSeconds: 75, cue: 'Hips high; lower for 3 s.', substitute: 'Elevate hands on a bench' },
      { name: 'Chair dips (feet flat)', sets: 3, reps: '6–10', restSeconds: 60, cue: 'Shoulders down, no shrugging.', substitute: 'Skip if you feel shoulder pinch' },
      { name: 'Shoulder taps', sets: 2, reps: '10 per side', restSeconds: 45, cue: 'Keep hips square — do not rotate.' },
    ],
    safety: 'Leave 1–2 reps in reserve on every set. Progress the incline (lower surface) only when all sets feel controlled.',
  },
  {
    id: 'w-lower-body',
    title: 'Lower Body Strength',
    summary: 'Single-leg and bilateral work for legs that carry you.',
    focus: ['strength'],
    intensity: 'moderate',
    minutes: 30,
    level: 'beginner',
    exercises: [
      { name: 'Bodyweight squats', sets: 2, reps: '12', restSeconds: 45, cue: 'Warm-up sets — crisp and easy.' },
      { name: 'Split squats', sets: 3, reps: '6–10 per leg', restSeconds: 90, cue: 'Rear knee kisses the floor.' },
      { name: 'Romanian deadlift (backpack)', sets: 3, reps: '10', restSeconds: 75, cue: 'Hips back, spine long.', substitute: 'Doorframe hinge with no load' },
      { name: 'Single-leg glute bridge', sets: 3, reps: '8 per leg', restSeconds: 45, cue: 'Level hips at the top.' },
      { name: 'Calf raises', sets: 3, reps: '15–20', restSeconds: 30, cue: 'Full range, 1 s pause on top.' },
    ],
    safety: 'Knees may feel work, not pain. Reduce range of motion if discomfort appears and rebuild from there.',
  },
  {
    id: 'w-core-stability',
    title: 'Core & Bracing',
    summary: 'Time under tension for a midsection that transfers force.',
    focus: ['strength'],
    intensity: 'light',
    minutes: 20,
    level: 'beginner',
    exercises: [
      { name: 'Forearm plank', sets: 3, reps: '30–60 s', restSeconds: 45, cue: 'One straight line — no sagging hips.' },
      { name: 'Dead bugs', sets: 3, reps: '8 per side', restSeconds: 45, cue: 'Lower back stays flat on the floor.' },
      { name: 'Side plank', sets: 2, reps: '20–30 s per side', restSeconds: 30, cue: 'Stack shoulders, push the floor away.' },
      { name: 'Bird dogs', sets: 3, reps: '8 per side', restSeconds: 30, cue: 'Reach long instead of high.' },
    ],
    safety: 'If your lower back sags during a plank, end the set early — quality beats duration.',
  },
  {
    id: 'w-mobility-reset',
    title: 'Mobility Reset',
    summary: 'A full-body range session for training days or rest days.',
    focus: ['mobility'],
    intensity: 'light',
    minutes: 20,
    level: 'beginner',
    exercises: [
      { name: '90/90 hip switches', sets: 2, reps: '8', restSeconds: 30, cue: 'Stay tall; move without hands if possible.' },
      { name: 'World’s greatest stretch', sets: 2, reps: '5 per side', restSeconds: 30, cue: 'Rotate from the mid-back.' },
      { name: 'Thoracic opener', sets: 2, reps: '8 per side', restSeconds: 30, cue: 'Keep the lower back quiet.' },
      { name: 'Deep squat hold', sets: 3, reps: '30 s', restSeconds: 30, cue: 'Heels down, elbows inside the knees.' },
      { name: 'Hamstring floss', sets: 2, reps: '10 per leg', restSeconds: 30, cue: 'Nerve glide, not a stretch contest.' },
    ],
    safety: 'Range work should feel like a 4–6 out of 10. Never force an end position.',
  },
  {
    id: 'w-endurance-easy',
    title: 'Easy Cardio Base',
    summary: 'Conversational-pace conditioning that you can repeat tomorrow.',
    focus: ['endurance'],
    intensity: 'light',
    minutes: 30,
    level: 'beginner',
    exercises: [
      { name: 'Brisk walk, cycle, row or swim', sets: 1, reps: '25–30 min continuous', restSeconds: 0, cue: 'Pace where you can speak in full sentences.' },
      { name: 'Easy cooldown', sets: 1, reps: '5 min', restSeconds: 0, cue: 'Let the heart rate fall gradually.' },
    ],
    safety: 'Two easy sessions outperform one brutal one. Skip intervals entirely if you are under-slept.',
  },
  {
    id: 'w-recovery-day',
    title: 'Recovery Day',
    summary: 'Rest is programmed. Down-regulate and note how you feel.',
    focus: ['mobility', 'recovery'],
    intensity: 'light',
    minutes: 15,
    level: 'beginner',
    exercises: [
      { name: 'Slow nasal breathing', sets: 1, reps: '5 min (4 s in / 6 s out)', restSeconds: 0, cue: 'Longer exhale than inhale.' },
      { name: 'Gentle full-body stretch', sets: 1, reps: '6 positions × 45 s', restSeconds: 0, cue: 'Comfortable tension only.' },
      { name: 'Easy walk', sets: 1, reps: '10 min optional', restSeconds: 0, cue: 'Outdoors if possible.' },
    ],
    safety: 'Rest days count as training. Do not compensate for them with extra volume.',
  },
];

export const WORKOUT_TEMPLATE_MAP: Record<string, WorkoutTemplate> = Object.fromEntries(
  WORKOUT_TEMPLATES.map((w) => [w.id, w]),
);
