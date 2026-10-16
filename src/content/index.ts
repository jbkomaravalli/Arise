import type { EngineDeps } from '@/core/progression';
import { ACHIEVEMENTS, ACHIEVEMENT_MAP } from './achievements';
import { LEARNING_PATHS, LESSONS, LESSON_MAP, lessonsForPath } from './lessons';
import { QUEST_TEMPLATES, QUEST_TEMPLATE_MAP } from './questTemplates';
import { SKILLS, SKILL_MAP } from './skills';
import { WORKOUT_TEMPLATES, WORKOUT_TEMPLATE_MAP } from './workouts';

/** Everything the progression engine needs, wired once. */
export const ENGINE_DEPS: EngineDeps = {
  templates: QUEST_TEMPLATE_MAP,
  achievements: ACHIEVEMENTS,
  skills: SKILLS,
  lessons: LESSON_MAP,
};

export {
  ACHIEVEMENTS,
  ACHIEVEMENT_MAP,
  LEARNING_PATHS,
  LESSONS,
  LESSON_MAP,
  lessonsForPath,
  QUEST_TEMPLATES,
  QUEST_TEMPLATE_MAP,
  SKILLS,
  SKILL_MAP,
  WORKOUT_TEMPLATES,
  WORKOUT_TEMPLATE_MAP,
};
