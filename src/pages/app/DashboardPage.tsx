import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  ArrowRight,
  Award,
  BookOpen,
  Brain,
  Dumbbell,
  Flame,
  Lock,
  Sparkles,
  Swords,
  Target,
  Trophy,
} from 'lucide-react';
import { useData } from '@/app/DataProvider';
import { ACHIEVEMENT_MAP } from '@/content';
import { ATTRIBUTES, MOTIVATIONAL_MESSAGES, RANK_COLORS } from '@/core/config';
import { rankStatus } from '@/core/rank';
import { levelProgress } from '@/core/level';
import { RankBadge } from '@/components/RankBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/layout';
import { ProgressBar, ProgressRing } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { QuestCard } from '@/components/features/QuestCard';
import { cn } from '@/lib/cn';
import { activeWeeklyQuests, pathMeta, todaysQuests } from '@/lib/quests';
import { addDays, formatShortDay, todayKey } from '@/lib/time';

function systemMessageFor(dayKey: string): string {
  let h = 0;
  for (let i = 0; i < dayKey.length; i += 1) h = (h * 31 + dayKey.charCodeAt(i)) >>> 0;
  return MOTIVATIONAL_MESSAGES[h % MOTIVATIONAL_MESSAGES.length];
}

function AttributeMini({ attribute, value }: { attribute: (typeof ATTRIBUTES)[number]; value: number }) {
  const next = attribute.milestones.find((m) => m.at > value);
  return (
    <Link
      to="/app/attributes"
      className="group rounded-xl border border-line/70 bg-abyss/40 p-3 transition-colors hover:border-primary/40"
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-faint">
          {attribute.shortLabel}
        </span>
        <span className="font-mono text-sm font-bold text-ink">{value}</span>
      </div>
      <ProgressBar
        value={value}
        className="mt-2 h-1.5"
        label={`${attribute.label} progress`}
      />
      <p className="mt-1.5 truncate text-[0.6875rem] text-muted">
        {next ? `Next: ${next.title}` : 'Max tier reached'}
      </p>
    </Link>
  );
}

export function DashboardPage() {
  const { bootstrap, stats, status, completeQuest, acceptQuest, skipQuest } = useData();
  const [busyId, setBusyId] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();

  const today = useMemo(() => (bootstrap ? todaysQuests(bootstrap) : []), [bootstrap]);
  const weekly = useMemo(() => (bootstrap ? activeWeeklyQuests(bootstrap) : []), [bootstrap]);

  const weekActivity = useMemo(() => {
    if (!bootstrap) return [];
    const dayKey = todayKey(bootstrap.profile.timezone);
    return Array.from({ length: 7 }, (_, i) => {
      const key = addDays(dayKey, i - 6);
      const completed = bootstrap.assignments.filter(
        (a) => a.assignedDate === key && a.status === 'completed',
      ).length;
      const sessions = bootstrap.workouts.filter((w) => w.date === key).length;
      const reflections = bootstrap.journal.filter((j) => j.date === key).length;
      return {
        key,
        label: formatShortDay(key),
        quests: completed,
        sessions: sessions + reflections,
      };
    });
  }, [bootstrap]);

  if (status === 'loading' || !bootstrap || !stats) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-44 w-full rounded-2xl" />
        <div className="grid gap-5 lg:grid-cols-3">
          <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  const level = levelProgress(stats.totalXp);
  const rank = rankStatus(stats);
  const completedToday = today.filter((q) => q.assignment.status === 'completed').length;
  const completionPct = today.length > 0 ? (completedToday / today.length) * 100 : 0;
  const dayKey = todayKey(bootstrap.profile.timezone);
  const attributeValues = Object.fromEntries(
    bootstrap.attributes.map((a) => [a.attribute, a.value]),
  ) as Record<(typeof ATTRIBUTES)[number]['key'], number>;

  const recentAchievements = [...bootstrap.achievements]
    .sort((a, b) => b.earnedAt.localeCompare(a.earnedAt))
    .slice(0, 3);
  const isNewHunter = stats.completedQuests === 0 && bootstrap.workouts.length === 0;

  const handleComplete = async (assignmentId: string, input: { evidence?: string; notes?: string }) => {
    setBusyId(assignmentId);
    try {
      await completeQuest({ assignmentId, ...input });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Identity + progression header */}
      <motion.section
        initial={reducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="energy-frame arcane-bg overflow-hidden rounded-2xl border border-line bg-surface/70"
      >
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative shrink-0">
              <ProgressRing
                percent={level.percent}
                size={104}
                strokeWidth={8}
                label="Level progress"
              >
                <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-faint">
                  Level
                </span>
                <span className="font-display text-3xl font-bold text-ink">{level.level}</span>
              </ProgressRing>
            </div>

            <div className="min-w-0">
              <p className="rune-badge mb-1">HUNTER PROFILE</p>
              <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
                {bootstrap.profile.displayName}
              </h1>
              <div className="mt-2.5 flex flex-wrap items-center gap-3">
                <RankBadge tier={stats.rank} size="sm" />
                <Badge variant="primary">
                  <Flame className="h-3 w-3" aria-hidden /> {stats.currentStreak}-day streak
                </Badge>
                <Badge variant="outline">{stats.completedQuests} quests completed</Badge>
              </div>

              <div className="mt-4 max-w-md">
                <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
                  <span className="font-mono">{stats.totalXp.toLocaleString()} XP total</span>
                  <span className="font-mono">
                    {level.isMax ? 'MAX LEVEL' : `${level.xpToNext} XP to level ${level.level + 1}`}
                  </span>
                </div>
                <ProgressBar value={level.xpIntoLevel} max={level.nextThreshold - level.currentThreshold} label="XP toward next level" />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:min-w-56">
            <div className="rounded-xl border border-line/70 bg-abyss/50 px-4 py-3">
              <p className="text-[0.625rem] uppercase tracking-[0.16em] text-faint">
                Today&rsquo;s completion
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-ink">
                {Math.round(completionPct)}%
              </p>
              <p className="text-xs text-muted">
                {completedToday} of {today.length} quests
              </p>
            </div>
            <div className="rounded-xl border border-line/70 bg-abyss/50 px-4 py-3">
              <p className="text-[0.625rem] uppercase tracking-[0.16em] text-faint">
                {rank.next ? `Next rank · ${rank.next.name}` : 'Highest rank'}
              </p>
              <p className="mt-1 font-display text-lg font-bold" style={{ color: RANK_COLORS[rank.next?.tier ?? stats.rank] }}>
                {rank.next ? `${rank.next.tier}-Rank` : 'SS — Transcendent'}
              </p>
              <ProgressBar value={rank.percent} className="mt-2 h-1.5" label="Rank progress" />
            </div>
            <p className="text-xs leading-relaxed text-muted lg:text-center">
              &ldquo;{systemMessageFor(dayKey)}&rdquo;
            </p>
          </div>
        </div>
      </motion.section>

      {isNewHunter && (
        <Card>
          <CardContent className="flex flex-col items-start gap-4 py-6 sm:flex-row sm:items-center">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/12">
              <Sparkles className="h-6 w-6 text-primary-soft" aria-hidden />
            </div>
            <div className="flex-1">
              <h2 className="font-display text-base font-semibold text-ink">
                Your system is waiting for its first quest
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                Every screen here fills with real data the moment you complete your first quest,
                log a training session, or write a reflection. Start with one — the system tracks
                the rest.
              </p>
            </div>
            <Link to="/app/quests">
              <Button>
                View quests <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Daily quests */}
        <section className="space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
              <Swords className="h-5 w-5 text-primary-soft" aria-hidden />
              Today&rsquo;s quests
            </h2>
            <Link
              to="/app/quests"
              className="text-xs font-medium text-primary-soft transition-colors hover:text-highlight"
            >
              View all →
            </Link>
          </div>

          {today.length === 0 ? (
            <EmptyState
              icon={<Swords className="h-8 w-8" aria-hidden />}
              title="No quests assigned yet"
              description="Your daily set is generated deterministically for your time zone. Reload to sync, or check your active paths in Settings."
            />
          ) : (
            <div className="space-y-3">
              {today.slice(0, 4).map(({ assignment, template }) => (
                <QuestCard
                  key={assignment.id}
                  assignment={assignment}
                  template={template}
                  compact
                  busy={busyId === assignment.id}
                  onAccept={(id) => void acceptQuest(id)}
                  onComplete={(id, input) => void handleComplete(id, input)}
                  onSkip={(id) => void skipQuest(id)}
                />
              ))}
            </div>
          )}

          {weekly.length > 0 && (
            <div className="pt-2">
              <h3 className="mb-3 flex items-center gap-2 font-display text-base font-semibold text-ink">
                <Trophy className="h-4.5 w-4.5 text-warning" aria-hidden /> Weekly challenge
              </h3>
              {weekly.map(({ assignment, template }) => (
                <QuestCard
                  key={assignment.id}
                  assignment={assignment}
                  template={template}
                  compact
                  busy={busyId === assignment.id}
                  onAccept={(id) => void acceptQuest(id)}
                  onComplete={(id, input) => void handleComplete(id, input)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Right column */}
        <section className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Attributes</CardTitle>
              <Link to="/app/attributes" className="text-xs font-medium text-primary-soft hover:text-highlight">
                Details →
              </Link>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2.5">
              {ATTRIBUTES.map((attribute) => (
                <AttributeMini
                  key={attribute.key}
                  attribute={attribute}
                  value={attributeValues[attribute.key] ?? 0}
                />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>This week</CardTitle>
              <span className="text-xs text-faint">Quests · sessions</span>
            </CardHeader>
            <CardContent>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekActivity} margin={{ top: 4, right: 0, bottom: 0, left: -24 }}>
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#6b6c82', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: '#6b6c82', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={30}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(139,92,246,0.08)' }}
                      contentStyle={{
                        background: '#171827',
                        border: '1px solid #292A3D',
                        borderRadius: 12,
                        fontSize: 12,
                        color: '#F8FAFC',
                      }}
                    />
                    <Bar dataKey="quests" name="Quests" radius={[4, 4, 0, 0]}>
                      {weekActivity.map((entry) => (
                        <Cell
                          key={entry.key}
                          fill={entry.key === dayKey ? '#8B5CF6' : '#4c4d68'}
                        />
                      ))}
                    </Bar>
                    <Bar dataKey="sessions" name="Sessions" fill="#38BDF8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Achievements</CardTitle>
              <Link to="/app/profile" className="text-xs font-medium text-primary-soft hover:text-highlight">
                All →
              </Link>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {recentAchievements.length === 0 ? (
                <p className="text-sm text-muted">
                  No achievements yet. Complete quests, lessons and training sessions to unlock
                  them.
                </p>
              ) : (
                recentAchievements.map((a) => {
                  const def = ACHIEVEMENT_MAP[a.achievementId];
                  if (!def) return null;
                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 rounded-xl border border-warning/25 bg-warning/8 px-3 py-2.5"
                    >
                      <Award className="h-4 w-4 shrink-0 text-warning" aria-hidden />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{def.name}</p>
                        <p className="truncate text-xs text-muted">{def.description}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div className="flex items-center gap-3 rounded-xl border border-line/70 bg-abyss/40 px-3 py-2.5 opacity-70">
                <Lock className="h-4 w-4 shrink-0 text-faint" aria-hidden />
                <p className="text-xs text-muted">
                  {Object.keys(ACHIEVEMENT_MAP).length - bootstrap.achievements.length} achievements
                  still locked
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Quick access */}
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            to: '/app/training',
            icon: Dumbbell,
            title: 'Training',
            copy: 'Log a session, follow a template, track records.',
            color: pathMeta('vitality').color,
          },
          {
            to: '/app/academy',
            icon: BookOpen,
            title: 'Academy',
            copy: 'Linux, networking and security lessons with quizzes.',
            color: pathMeta('intelligence').color,
          },
          {
            to: '/app/mindset',
            icon: Brain,
            title: 'Mindset',
            copy: 'Reflections, focus sessions and weekly review.',
            color: pathMeta('discipline').color,
          },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              'group rounded-2xl border border-line bg-surface/60 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40',
            )}
          >
            <item.icon className="mb-3 h-6 w-6" style={{ color: item.color }} aria-hidden />
            <h3 className="font-display text-base font-semibold text-ink">{item.title}</h3>
            <p className="mt-1 text-sm text-muted">{item.copy}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary-soft">
              Open <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </span>
          </Link>
        ))}
      </section>

      {/* Rank path */}
      <section className="rounded-2xl border border-line bg-surface/60 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <Target className="h-5 w-5 text-primary-soft" aria-hidden /> Rank progression
          </h2>
          <span className="text-xs text-muted">
            {rank.next ? `${Math.round(rank.percent)}% toward ${rank.next.tier}` : 'Top rank achieved'}
          </span>
        </div>
        <ol className="flex flex-wrap items-center gap-2">
          {(['E', 'D', 'C', 'B', 'A', 'S', 'SS'] as const).map((tier) => {
            const reached = tier === stats.rank;
            const done = ['E', 'D', 'C', 'B', 'A', 'S', 'SS'].indexOf(tier) <= ['E', 'D', 'C', 'B', 'A', 'S', 'SS'].indexOf(stats.rank);
            return (
              <li
                key={tier}
                className={cn(
                  'flex items-center gap-2 rounded-xl border px-3 py-2',
                  reached
                    ? 'border-primary/50 bg-primary/10'
                    : done
                      ? 'border-line bg-abyss/40'
                      : 'border-line/60 bg-abyss/20 opacity-60',
                )}
              >
                <span
                  className="font-display text-base font-bold"
                  style={{ color: RANK_COLORS[tier] }}
                >
                  {tier}
                </span>
                <span className="text-xs text-muted">
                  {tier === 'SS' ? 'Transcendent' : reached ? 'Current' : ''}
                </span>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
