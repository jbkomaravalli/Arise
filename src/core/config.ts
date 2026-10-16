import type { AttributeKey, Difficulty, DevelopmentPath, RankTier } from './types';

/** Central, configurable progression tuning. Nothing here is duplicated elsewhere. */
export const PROGRESSION = {
  /** Cumulative XP required to *be* level L: 100 × (L − 1)². Level 1 starts at 0 XP. */
  basePerLevel: 100,
  levelCap: 100,
  /** Attribute score = ATTR.max × (1 − e^(−attrXp / ATTR.scale)) */
  attribute: { scale: 600, max: 100 },
} as const;

export const XP_REWARDS: Record<Difficulty, number> = {
  easy: 10,
  medium: 25,
  hard: 50,
};

/** Weekly challenges: 75–150 XP depending on difficulty. */
export const CHALLENGE_XP: Record<Difficulty, number> = {
  easy: 75,
  medium: 100,
  hard: 150,
};

export interface AttributeDefinition {
  key: AttributeKey;
  label: string;
  shortLabel: string;
  description: string;
  path: DevelopmentPath;
  /** Named milestones shown on the attributes screen. */
  milestones: { at: number; title: string; detail: string }[];
}

export const ATTRIBUTES: AttributeDefinition[] = [
  {
    key: 'strength',
    label: 'Strength',
    shortLabel: 'STR',
    description: 'Pushing, pulling and holding your own body with control.',
    path: 'vitality',
    milestones: [
      { at: 10, title: 'Base Frame', detail: 'Consistent full-body sessions are building tissue tolerance.' },
      { at: 25, title: 'Working Capacity', detail: 'You move external and body weight with steady form.' },
      { at: 40, title: 'Tension Master', detail: 'Bracing and scapular control under load are reliable.' },
      { at: 55, title: 'Calisthenics Core', detail: 'Push/pull progressions feel earned, not survived.' },
      { at: 70, title: 'Powerful Build', detail: 'Advanced variations enter your working sets.' },
      { at: 85, title: 'Elite Force', detail: 'High-skill holds and explosive work are in range.' },
      { at: 100, title: 'Ascendant Physique', detail: 'The top of the current scale — keep progressing in load and skill.' },
    ],
  },
  {
    key: 'endurance',
    label: 'Endurance',
    shortLabel: 'END',
    description: 'Sustained effort — cardio, work capacity and recovery.',
    path: 'vitality',
    milestones: [
      { at: 10, title: 'Steady Breath', detail: 'You can hold continuous effort for a useful block of time.' },
      { at: 25, title: 'Engine Builder', detail: 'Sessions stack without long recovery walls.' },
      { at: 40, title: 'Aerobic Base', detail: 'Easy work feels easy; hard work is survivable.' },
      { at: 55, title: 'Paced Warrior', detail: 'You can hold and adjust pace intentionally.' },
      { at: 70, title: 'Deep Tank', detail: 'Longer efforts stop being intimidating.' },
      { at: 85, title: 'Relentless', detail: 'Work capacity is well above your starting point.' },
      { at: 100, title: 'Infinite Drive', detail: 'The ceiling of the current scale.' },
    ],
  },
  {
    key: 'mobility',
    label: 'Mobility',
    shortLabel: 'MOB',
    description: 'Range of motion, control at end range and joint health.',
    path: 'vitality',
    milestones: [
      { at: 10, title: 'Loosening Up', detail: 'Basic ranges are being opened regularly.' },
      { at: 25, title: 'Fluid Joints', detail: 'Everyday positions feel less stiff.' },
      { at: 40, title: 'Controlled Range', detail: 'You own the bottom of key positions.' },
      { at: 55, title: 'Supple Frame', detail: 'Hinges, squats and overhead positions look clean.' },
      { at: 70, title: 'Elastic Range', detail: 'Active control through full range is present.' },
      { at: 85, title: 'Free Movement', detail: 'Restriction is rarely the limiter anymore.' },
      { at: 100, title: 'Pristine Mechanics', detail: 'The ceiling of the current scale.' },
    ],
  },
  {
    key: 'technical',
    label: 'Technical Knowledge',
    shortLabel: 'TEC',
    description: 'Linux, networking, scripting and security fundamentals.',
    path: 'intelligence',
    milestones: [
      { at: 10, title: 'Shell Apprentice', detail: 'You can navigate and manipulate a Linux system deliberately.' },
      { at: 25, title: 'Command Fluency', detail: 'Pipes, permissions and processes read like a language.' },
      { at: 40, title: 'Systems Literate', detail: 'Networking and services make structural sense.' },
      { at: 55, title: 'Script Crafter', detail: 'You automate what you used to do by hand.' },
      { at: 70, title: 'Defender Practitioner', detail: 'You reason about risk with real vocabulary.' },
      { at: 85, title: 'Security Adept', detail: 'Authorized lab work is routine for you.' },
      { at: 100, title: 'Technical Ascendant', detail: 'The ceiling of the current scale.' },
    ],
  },
  {
    key: 'problemSolving',
    label: 'Problem Solving',
    shortLabel: 'PRO',
    description: 'Debugging, analysis and structured reasoning under uncertainty.',
    path: 'intelligence',
    milestones: [
      { at: 10, title: 'Careful Debugger', detail: 'You read errors before panicking.' },
      { at: 25, title: 'Hypothesis Tester', detail: 'You isolate variables instead of guessing wildly.' },
      { at: 40, title: 'Systems Thinker', detail: 'You trace issues across boundaries.' },
      { at: 55, title: 'Methodical Analyst', detail: 'Structured investigation is your default.' },
      { at: 70, title: 'Sharp Resolver', detail: 'Hard puzzles become manageable sequences.' },
      { at: 85, title: 'Deep Operator', detail: 'You solve problems others describe as vague.' },
      { at: 100, title: 'Grand Architect', detail: 'The ceiling of the current scale.' },
    ],
  },
  {
    key: 'discipline',
    label: 'Discipline',
    shortLabel: 'DIS',
    description: 'Consistency, focus, reflection and deliberate practice.',
    path: 'discipline',
    milestones: [
      { at: 10, title: 'First Routines', detail: 'You are showing up with intent.' },
      { at: 25, title: 'Habit Foundation', detail: 'The basics repeat without much negotiation.' },
      { at: 40, title: 'Steady Execution', detail: 'Plans survive contact with a normal day.' },
      { at: 55, title: 'Focused Operator', detail: 'Distraction gets interrupted earlier.' },
      { at: 70, title: 'Self-Directed', detail: 'You set the pace without external pressure.' },
      { at: 85, title: 'Unbreakable Routine', detail: 'Consistency is identity, not effort.' },
      { at: 100, title: 'Supreme Will', detail: 'The ceiling of the current scale.' },
    ],
  },
];

export const ATTRIBUTE_MAP: Record<AttributeKey, AttributeDefinition> = Object.fromEntries(
  ATTRIBUTES.map((a) => [a.key, a]),
) as Record<AttributeKey, AttributeDefinition>;

export interface RankRequirement {
  label: string;
  metric: 'level' | 'quests' | 'activeDays' | 'achievements' | 'lessons' | 'workouts' | 'streak' | 'pathQuests';
  target: number;
  /** Only for pathQuests. */
  path?: DevelopmentPath;
}

export interface RankDefinition {
  tier: RankTier;
  name: string;
  description: string;
  requirements: RankRequirement[];
}

/** Original ARISE rank ladder — thresholds are configuration, not code law. */
export const RANK_LADDER: RankDefinition[] = [
  {
    tier: 'E',
    name: 'Awakening',
    description: 'You answered the call. The system is watching.',
    requirements: [],
  },
  {
    tier: 'D',
    name: 'Initiate',
    description: 'First real consistency is proven.',
    requirements: [
      { label: 'Reach level 3', metric: 'level', target: 3 },
      { label: 'Complete 5 quests', metric: 'quests', target: 5 },
      { label: 'Be active on 3 separate days', metric: 'activeDays', target: 3 },
    ],
  },
  {
    tier: 'C',
    name: 'Adept',
    description: 'Routine is forming across multiple paths.',
    requirements: [
      { label: 'Reach level 6', metric: 'level', target: 6 },
      { label: 'Complete 15 quests', metric: 'quests', target: 15 },
      { label: 'Be active on 7 separate days', metric: 'activeDays', target: 7 },
      { label: 'Earn 2 achievements', metric: 'achievements', target: 2 },
    ],
  },
  {
    tier: 'B',
    name: 'Elite',
    description: 'You deliver results on demand, in all three paths.',
    requirements: [
      { label: 'Reach level 10', metric: 'level', target: 10 },
      { label: 'Complete 30 quests', metric: 'quests', target: 30 },
      { label: 'Be active on 14 separate days', metric: 'activeDays', target: 14 },
      { label: 'Earn 4 achievements', metric: 'achievements', target: 4 },
      { label: 'Complete 8 Vitality quests', metric: 'pathQuests', target: 8, path: 'vitality' },
      { label: 'Complete 8 Intelligence quests', metric: 'pathQuests', target: 8, path: 'intelligence' },
      { label: 'Complete 8 Discipline quests', metric: 'pathQuests', target: 8, path: 'discipline' },
    ],
  },
  {
    tier: 'A',
    name: 'Master',
    description: 'Demonstrated skill, not time spent.',
    requirements: [
      { label: 'Reach level 15', metric: 'level', target: 15 },
      { label: 'Complete 60 quests', metric: 'quests', target: 60 },
      { label: 'Be active on 30 separate days', metric: 'activeDays', target: 30 },
      { label: 'Earn 6 achievements', metric: 'achievements', target: 6 },
      { label: 'Complete 10 Academy lessons', metric: 'lessons', target: 10 },
      { label: 'Log 12 training sessions', metric: 'workouts', target: 12 },
    ],
  },
  {
    tier: 'S',
    name: 'Ascendant',
    description: 'Capability under pressure, earned in the real world.',
    requirements: [
      { label: 'Reach level 22', metric: 'level', target: 22 },
      { label: 'Complete 100 quests', metric: 'quests', target: 100 },
      { label: 'Be active on 60 separate days', metric: 'activeDays', target: 60 },
      { label: 'Earn 9 achievements', metric: 'achievements', target: 9 },
      { label: 'Complete 20 Academy lessons', metric: 'lessons', target: 20 },
      { label: 'Log 25 training sessions', metric: 'workouts', target: 25 },
    ],
  },
  {
    tier: 'SS',
    name: 'Transcendent',
    description: 'The system has nothing left to teach you about consistency.',
    requirements: [
      { label: 'Reach level 30', metric: 'level', target: 30 },
      { label: 'Complete 160 quests', metric: 'quests', target: 160 },
      { label: 'Be active on 120 separate days', metric: 'activeDays', target: 120 },
      { label: 'Earn 12 achievements', metric: 'achievements', target: 12 },
      { label: 'Hold a 14-day streak', metric: 'streak', target: 14 },
    ],
  },
];

export const RANK_COLORS: Record<RankTier, string> = {
  E: '#94a3b8',
  D: '#38bdf8',
  C: '#34d399',
  B: '#818cf8',
  A: '#fbbf24',
  S: '#f472b6',
  SS: '#facc15',
};

export const PATHS: {
  id: DevelopmentPath;
  name: string;
  tagline: string;
  description: string;
  color: string;
}[] = [
  {
    id: 'vitality',
    name: 'Vitality',
    tagline: 'Forge the body',
    description:
      'Calisthenics, endurance, mobility and recovery — structured progressive training with rest treated as part of the plan.',
    color: '#34d399',
  },
  {
    id: 'intelligence',
    name: 'Intelligence',
    tagline: 'Sharpen the mind',
    description:
      'Linux, networking, scripting and defensive security fundamentals with authorized, hands-on practice.',
    color: '#38bdf8',
  },
  {
    id: 'discipline',
    name: 'Discipline',
    tagline: 'Command the self',
    description:
      'Reflection, focus, planning and deliberate practice — the operating system behind the other two paths.',
    color: '#a78bfa',
  },
];

export const PATH_MAP = Object.fromEntries(PATHS.map((p) => [p.id, p])) as Record<
  DevelopmentPath,
  (typeof PATHS)[number]
>;

export const MOTIVATIONAL_MESSAGES = [
  'The system does not reward intention. It rewards completed quests.',
  'Progress is quiet. It accumulates while nobody is watching.',
  'A missed day is data, not a verdict. Log it and continue.',
  'Rest is programmed, not failure. Recover so the next session counts.',
  'Small, repeatable actions compound into a different person.',
  'You do not need motivation to start. You need a start to find motivation.',
  'Skill compounds faster than intensity. Show up again tomorrow.',
  'The gap between who you are and who you want to be is a queue of unfinished quests.',
];
