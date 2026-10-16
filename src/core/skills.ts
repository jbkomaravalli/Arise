import type {
  AttributeKey,
  DevelopmentPath,
  LearningProgress,
  ProgressionStats,
  SkillState,
  UserSkill,
} from './types';

/**
 * Skill nodes are *derived* from real records — never toggled by hand — so a
 * skill can only be completed when the underlying evidence exists.
 */
export type SkillMeasure =
  | { kind: 'quests'; path: DevelopmentPath; target: number }
  | { kind: 'lessons'; paths?: string[]; target: number }
  | { kind: 'workouts'; target: number }
  | { kind: 'journal'; target: number }
  | { kind: 'focusMinutes'; target: number }
  | { kind: 'attribute'; attribute: AttributeKey; target: number }
  | { kind: 'streak'; target: number };

export interface SkillDefinition {
  id: string;
  path: DevelopmentPath;
  title: string;
  summary: string;
  /** Explicit unlock instructions shown on the node. */
  unlockHint: string;
  /** Grid column (0-based) for tree layout. */
  column: number;
  /** Grid row (0-based) for tree layout. */
  row: number;
  prerequisites: string[];
  measure: SkillMeasure;
}

export interface SkillViewState {
  def: SkillDefinition;
  state: SkillState;
  current: number;
  target: number;
  percent: number;
  /** Prerequisite skill ids that are not completed yet. */
  blockedBy: string[];
}

export interface SkillComputeInput {
  definitions: SkillDefinition[];
  owned: UserSkill[];
  stats: ProgressionStats;
  attributeValues: Record<AttributeKey, number>;
  lessons: LearningProgress[];
}

function measureCurrent(
  measure: SkillMeasure,
  stats: ProgressionStats,
  attributeValues: Record<AttributeKey, number>,
  lessons: LearningProgress[],
): number {
  switch (measure.kind) {
    case 'quests':
      return stats.questsByPath[measure.path];
    case 'lessons':
      return lessons.filter(
        (l) => l.state === 'completed' && (!measure.paths || measure.paths.some((p) => l.lessonId.startsWith(p))),
      ).length;
    case 'workouts':
      return stats.workoutsLogged;
    case 'journal':
      return stats.reflectionsLogged;
    case 'focusMinutes':
      return stats.focusMinutes;
    case 'attribute':
      return attributeValues[measure.attribute] ?? 0;
    case 'streak':
      return Math.max(stats.currentStreak, stats.longestStreak);
  }
}

export function computeSkillStates(input: SkillComputeInput): SkillViewState[] {
  const { definitions, owned, stats, attributeValues, lessons } = input;
  const ownedMap = new Map(owned.map((s) => [s.skillId, s]));
  const completedIds = new Set(
    owned.filter((s) => s.state === 'completed').map((s) => s.skillId),
  );

  return definitions
    .slice()
    .sort((a, b) => a.row - b.row || a.column - b.column)
    .map((def) => {
      const blockedBy = def.prerequisites.filter((p) => !completedIds.has(p));
      const current = measureCurrent(def.measure, stats, attributeValues, lessons);
      const target = def.measure.target;
      const percent = target <= 0 ? 100 : Math.min(100, (current / target) * 100);

      let state: SkillState;
      if (blockedBy.length > 0) state = 'locked';
      else if (current >= target) state = 'completed';
      else if (current > 0) state = 'in_progress';
      else state = 'available';

      // Persisted "completed" wins when records already satisfied the node in
      // a previous session (kept for cross-device consistency).
      if (state !== 'completed' && ownedMap.get(def.id)?.state === 'completed') {
        state = 'completed';
      }

      return { def, state, current, target, percent, blockedBy };
    });
}
