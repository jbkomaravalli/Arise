import { PATH_MAP } from '@/core/config';
import { QUEST_TEMPLATES } from '@/content/questTemplates';
import type {
  Bootstrap,
  DevelopmentPath,
  Difficulty,
  QuestAssignment,
  QuestStatus,
  QuestTemplate,
} from '@/core/types';
import { todayKey, weekStart } from './time';

const TEMPLATES_MAP: Record<string, QuestTemplate> = Object.fromEntries(
  QUEST_TEMPLATES.map((t) => [t.id, t]),
);

export interface QuestView {
  assignment: QuestAssignment;
  template: QuestTemplate | undefined;
}

export function templateFor(templateId: string): QuestTemplate | undefined {
  return TEMPLATES_MAP[templateId];
}

/** Today's daily quests in the user's time zone, simplest status first. */
export function todaysQuests(bootstrap: Bootstrap, now: Date = new Date()): QuestView[] {
  const dayKey = todayKey(bootstrap.profile.timezone, now);
  return bootstrap.assignments
    .filter((a) => a.assignedDate === dayKey && a.cadence === 'daily')
    .map((a) => ({ assignment: a, template: templateFor(a.templateId) }))
    .sort((a, b) => statusOrder(a.assignment.status) - statusOrder(b.assignment.status));
}

/** The current week's challenge quests. */
export function weeklyQuests(bootstrap: Bootstrap, now: Date = new Date()): QuestView[] {
  const dayKey = todayKey(bootstrap.profile.timezone, now);
  const week = weekStart(dayKey);
  return bootstrap.assignments
    .filter((a) => a.cadence === 'weekly' && a.assignedDate === week)
    .map((a) => ({ assignment: a, template: templateFor(a.templateId) }));
}

/** Upcoming weekly challenges still open. */
export function activeWeeklyQuests(bootstrap: Bootstrap, now: Date = new Date()): QuestView[] {
  return weeklyQuests(bootstrap, now).filter(
    (v) => v.assignment.status === 'available' || v.assignment.status === 'in_progress',
  );
}

function statusOrder(status: QuestStatus): number {
  switch (status) {
    case 'available':
      return 0;
    case 'in_progress':
      return 1;
    case 'completed':
      return 2;
    case 'expired':
      return 3;
    case 'skipped':
      return 4;
  }
}

export const STATUS_META: Record<QuestStatus, { label: string; tone: string }> = {
  available: { label: 'Available', tone: 'text-highlight' },
  in_progress: { label: 'In progress', tone: 'text-warning' },
  completed: { label: 'Completed', tone: 'text-success' },
  expired: { label: 'Expired', tone: 'text-faint' },
  skipped: { label: 'Skipped', tone: 'text-faint' },
};

export function pathMeta(path: DevelopmentPath) {
  return PATH_MAP[path];
}

export const DIFFICULTY_META: Record<Difficulty, { label: string }> = {
  easy: { label: 'Easy' },
  medium: { label: 'Medium' },
  hard: { label: 'Hard' },
};
