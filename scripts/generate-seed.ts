/**
 * Generates `supabase/seed.sql` from the TypeScript content library so the
 * database seed can never drift from the app's quest/achievement/skill data.
 *
 * Run: npm run seed:generate
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { QUEST_TEMPLATES } from '../src/content/questTemplates';
import { ACHIEVEMENTS } from '../src/content/achievements';
import { SKILLS } from '../src/content/skills';
import { LESSONS } from '../src/content/lessons';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'supabase');
mkdirSync(outDir, { recursive: true });

const q = (value: string | null | undefined): string =>
  value == null ? 'null' : `'${value.replace(/'/g, "''")}'`;

const j = (value: unknown): string => {
  const raw = JSON.stringify(value);
  return `'${raw.replace(/'/g, "''")}'`;
};

const bool = (value: boolean | undefined): string => (value ? 'true' : 'false');
const num = (value: number | null | undefined): string => (value == null ? 'null' : String(value));

const banner = [
  '-- ===========================================================================',
  '-- ARISE seed data',
  '--',
  '-- GENERATED FILE — do not edit by hand.',
  '-- Regenerate with: npm run seed:generate',
  '-- Source of truth: src/content (questTemplates, lessons, achievements, skills)',
  '--',
  '-- Apply with:  supabase db push   (or paste into the SQL editor)',
  '-- ===========================================================================',
  '',
  'begin;',
  '',
  'truncate table public.quest_templates restart identity cascade;',
  'truncate table public.achievements cascade;',
  'truncate table public.skill_defs cascade;',
  'truncate table public.lesson_defs cascade;',
].join('\n');

const lessonsBlock = [
  '',
  '-- ---------------------------------------------------------------- lessons',
  '-- XP rewards must be known server-side: the completion RPC refuses lessons',
  '-- that are not seeded here.',
  'insert into public.lesson_defs (id, path_id, title, xp_reward, minutes)',
  'values',
  LESSONS.map((l) => `  (${[q(l.id), q(l.pathId), q(l.title), String(l.xpReward), String(l.minutes)].join(', ')})`).join(',\n'),
  ';',
].join('\n');

const questsBlock = [
  '',
  '-- ---------------------------------------------------------------- quests',
  "insert into public.quest_templates",
  '  (id, title, description, path, difficulty, cadence, duration_minutes,',
  '   instructions, criteria, xp_reward, min_level, requires_skills, tags,',
  '   confirm_required, attribute_weights, challenge)',
  'values',
  QUEST_TEMPLATES.map((t) => {
    const parts = [
      q(t.id),
      q(t.title),
      q(t.description),
      q(t.path),
      q(t.difficulty),
      q(t.cadence),
      String(t.durationMinutes),
      j(t.instructions),
      j(t.criteria),
      num(t.xpReward ?? null),
      // Column is `not null default 1`; the TS engine reads absence as 1 too.
      num(t.minLevel ?? 1),
      t.requiresSkills && t.requiresSkills.length > 0
        ? `array[${t.requiresSkills.map(q).join(', ')}]::text[]`
        : 'null',
      t.tags.length > 0 ? `array[${t.tags.map(q).join(', ')}]::text[]` : 'null',
      bool(t.confirmRequired),
      j(t.attributeWeights),
      bool(t.challenge),
    ];
    return `  (${parts.join(', ')})`;
  }).join(',\n'),
  ';',
].join('\n');

const achievementsBlock = [
  '',
  '-- ---------------------------------------------------------- achievements',
  '-- Rules are stored for documentation and future server-side evaluation;',
  '-- arise_evaluate_progress() mirrors src/core/achievements.ts exactly.',
  'insert into public.achievements (id, name, description, icon, xp_reward, attribute_weights, rule)',
  'values',
  ACHIEVEMENTS.map(
    (a) =>
      `  (${[q(a.id), q(a.name), q(a.description), q(a.icon), String(a.xpReward), j(a.attributeWeights), j(a.rule)].join(', ')})`,
  ).join(',\n'),
  ';',
].join('\n');

const skillsBlock = [
  '',
  '-- -------------------------------------------------------------- skill defs',
  'insert into public.skill_defs (id, path, column_index, row_index, prerequisites, measure)',
  'values',
  SKILLS.map(
    (s) =>
      `  (${[
        q(s.id),
        q(s.path),
        String(s.column),
        String(s.row),
        s.prerequisites.length > 0
          ? `array[${s.prerequisites.map(q).join(', ')}]::text[]`
          : 'array[]::text[]',
        j(s.measure),
      ].join(', ')})`,
  ).join(',\n'),
  ';',
].join('\n');

const footer = [
  '',
  'commit;',
  '',
  '-- Verification hints (safe to run afterwards):',
  `--   select count(*) from public.quest_templates;  -- expect ${QUEST_TEMPLATES.length}`,
  `--   select count(*) from public.lesson_defs;      -- expect ${LESSONS.length}`,
  `--   select count(*) from public.achievements;     -- expect ${ACHIEVEMENTS.length}`,
  `--   select count(*) from public.skill_defs;       -- expect ${SKILLS.length}`,
  '',
].join('\n');

const output = [banner, lessonsBlock, questsBlock, achievementsBlock, skillsBlock, footer].join('\n');
writeFileSync(join(outDir, 'seed.sql'), output, 'utf8');
console.log(
  `Wrote supabase/seed.sql — ${QUEST_TEMPLATES.length} quests, ${LESSONS.length} lessons, ${ACHIEVEMENTS.length} achievements, ${SKILLS.length} skills.`,
);
