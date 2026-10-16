import { useMemo, useState } from 'react';
import { Award, BookOpen, Brain, Dumbbell, ScrollText, Swords } from 'lucide-react';
import { useData } from '@/app/DataProvider';
import { ACHIEVEMENT_MAP } from '@/content';
import { LESSON_MAP } from '@/content/lessons';
import { QUEST_TEMPLATES } from '@/content/questTemplates';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState, PageHeader, Segmented, Stat } from '@/components/ui/layout';
import { cn } from '@/lib/cn';
import { formatDayKey } from '@/lib/time';

type Filter = 'all' | 'quests' | 'lessons' | 'workouts' | 'reflections' | 'achievements';
type Range = '7' | '30' | '90' | 'all';

const TEMPLATE_TITLES: Record<string, string> = Object.fromEntries(
  QUEST_TEMPLATES.map((t) => [t.id, t.title]),
);
const LESSON_TITLES: Record<string, string> = Object.fromEntries(
  Object.entries(LESSON_MAP).map(([id, lesson]) => [id, lesson.title]),
);

interface TimelineItem {
  id: string;
  kind: Filter;
  title: string;
  detail: string;
  date: string;
  timestamp: string;
  xp?: number;
}

const KIND_META: Record<Filter, { label: string; icon: typeof Swords; className: string }> = {
  all: { label: 'All', icon: Swords, className: 'text-muted' },
  quests: { label: 'Quests', icon: Swords, className: 'text-primary-soft' },
  lessons: { label: 'Lessons', icon: BookOpen, className: 'text-highlight' },
  workouts: { label: 'Training', icon: Dumbbell, className: 'text-success' },
  reflections: { label: 'Reflections', icon: Brain, className: 'text-primary-soft' },
  achievements: { label: 'Achievements', icon: Award, className: 'text-warning' },
};

export function HistoryPage() {
  const { bootstrap, stats } = useData();
  const [filter, setFilter] = useState<Filter>('all');
  const [range, setRange] = useState<Range>('30');
  const [visible, setVisible] = useState(25);

  const items = useMemo<TimelineItem[]>(() => {
    if (!bootstrap) return [];
    const out: TimelineItem[] = [];

    for (const assignment of bootstrap.assignments) {
      if (assignment.status !== 'completed' || !assignment.completedAt) continue;
      out.push({
        id: `qa-${assignment.id}`,
        kind: 'quests',
        title: `Quest completed`,
        detail: assignment.templateId,
        date: assignment.assignedDate,
        timestamp: assignment.completedAt,
        xp: assignment.xpAwarded,
      });
    }
    for (const lesson of bootstrap.lessons) {
      if (lesson.state !== 'completed' || !lesson.completedAt) continue;
      out.push({
        id: `ls-${lesson.lessonId}`,
        kind: 'lessons',
        title: 'Academy lesson completed',
        detail: lesson.lessonId,
        date: lesson.completedAt.slice(0, 10),
        timestamp: lesson.completedAt,
      });
    }
    for (const workout of bootstrap.workouts) {
      out.push({
        id: `ws-${workout.id}`,
        kind: 'workouts',
        title: workout.title,
        detail: `${workout.durationMinutes} min · ${workout.intensity}`,
        date: workout.date,
        timestamp: workout.createdAt,
      });
    }
    for (const entry of bootstrap.journal) {
      out.push({
        id: `jr-${entry.id}`,
        kind: 'reflections',
        title: entry.prompt ?? 'Daily reflection',
        detail: entry.content.slice(0, 120),
        date: entry.date,
        timestamp: entry.createdAt,
      });
    }
    for (const achievement of bootstrap.achievements) {
      const def = ACHIEVEMENT_MAP[achievement.achievementId];
      out.push({
        id: `ua-${achievement.id}`,
        kind: 'achievements',
        title: def?.name ?? achievement.achievementId,
        detail: def?.description ?? 'Achievement earned',
        date: achievement.earnedAt.slice(0, 10),
        timestamp: achievement.earnedAt,
        xp: def?.xpReward,
      });
    }

    // Resolve quest template titles (kept out of the loop above to allow lookup).
    for (const item of out) {
      if (item.kind === 'quests') {
        const assignment = bootstrap.assignments.find((a) => `qa-${a.id}` === item.id);
        if (assignment) {
          const template = TEMPLATE_TITLES[assignment.templateId];
          item.title = template ? `Quest — ${template}` : 'Quest completed';
          item.detail = assignment.evidence ?? '';
        }
      } else if (item.kind === 'lessons') {
        const id = item.id.replace('ls-', '');
        const name = LESSON_TITLES[id];
        if (name) item.title = `Lesson — ${name}`;
      }
    }

    return out.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [bootstrap]);

  const filtered = useMemo(() => {
    if (!bootstrap) return [];
    const cutoff =
      range === 'all'
        ? null
        : new Date(Date.now() - Number(range) * 86_400_000).toISOString().slice(0, 10);
    return items.filter(
      (item) =>
        (filter === 'all' || item.kind === filter) && (!cutoff || item.date >= cutoff),
    );
  }, [items, filter, range, bootstrap]);

  if (!bootstrap) return null;

  const grouped = filtered.reduce<Record<string, TimelineItem[]>>((acc, item) => {
    (acc[item.date] ??= []).push(item);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div>
      <PageHeader
        eyebrow="RECORDS"
        title="History"
        description="Every completed quest, lesson, session and reflection — the evidence your progression is built on."
        actions={
          <Segmented<Range>
            value={range}
            onChange={setRange}
            options={[
              { value: '7', label: '7 days' },
              { value: '30', label: '30 days' },
              { value: '90', label: '90 days' },
              { value: 'all', label: 'All' },
            ]}
          />
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total XP" value={(stats?.totalXp ?? 0).toLocaleString()} sub="lifetime" />
        <Stat label="Quests completed" value={stats?.completedQuests ?? 0} sub="lifetime" />
        <Stat label="Active days" value={stats?.distinctActiveDays ?? 0} sub="days with evidence" />
        <Stat label="Longest streak" value={`${stats?.longestStreak ?? 0} days`} sub="personal record" />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {(Object.keys(KIND_META) as Filter[]).map((kind) => {
          const meta = KIND_META[kind];
          const active = filter === kind;
          return (
            <button
              key={kind}
              onClick={() => setFilter(kind)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                active
                  ? 'border-primary/50 bg-primary/12 text-ink'
                  : 'border-line bg-abyss/40 text-muted hover:text-ink',
              )}
            >
              <meta.icon className={cn('h-3.5 w-3.5', meta.className)} aria-hidden />
              {meta.label}
            </button>
          );
        })}
      </div>

      {dates.length === 0 ? (
        <EmptyState
          icon={<ScrollText className="h-8 w-8" aria-hidden />}
          title="Nothing recorded in this window"
          description="Complete a quest, lesson, training session or reflection and it appears here automatically."
        />
      ) : (
        <div className="space-y-8">
          {dates.slice(0, Math.ceil(visible / 5)).map((date) => (
            <section key={date}>
              <h2 className="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-faint">
                {formatDayKey(date)}
              </h2>
              <ul className="space-y-2">
                {grouped[date].map((item) => {
                  const meta = KIND_META[item.kind];
                  return (
                    <li
                      key={item.id}
                      className="flex items-start gap-3 rounded-xl border border-line/70 bg-surface/60 px-4 py-3"
                    >
                      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line bg-abyss/60">
                        <meta.icon className={cn('h-4 w-4', meta.className)} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink">{item.title}</p>
                        {item.detail && (
                          <p className="mt-0.5 text-xs leading-relaxed break-words text-muted">
                            {item.detail}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge variant="outline">{meta.label}</Badge>
                        {item.xp ? (
                          <span className="font-mono text-xs font-bold text-primary-soft">
                            +{item.xp} XP
                          </span>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {visible < filtered.length && (
            <div className="flex justify-center">
              <Button variant="secondary" onClick={() => setVisible((v) => v + 25)}>
                Load older records
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
