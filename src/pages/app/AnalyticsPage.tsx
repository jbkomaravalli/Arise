import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Award, BarChart3, CalendarCheck2, Sparkles, TrendingUp } from 'lucide-react';
import { useData } from '@/app/DataProvider';
import { ACHIEVEMENT_MAP } from '@/content';
import { PATHS, RANK_COLORS } from '@/core/config';
import { levelProgress } from '@/core/level';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState, PageHeader, Segmented, Stat } from '@/components/ui/layout';
import { formatShortDay, todayKey, weekStart } from '@/lib/time';

type Range = '7' | '14' | '30' | '90';

const tooltipStyle = {
  background: '#171827',
  border: '1px solid #292A3D',
  borderRadius: 12,
  fontSize: 12,
  color: '#F8FAFC',
} as const;

export function AnalyticsPage() {
  const { bootstrap, stats } = useData();
  const [range, setRange] = useState<Range>('30');

  const days = useMemo(() => Number(range), [range]);

  const xpSeries = useMemo(() => {
    if (!bootstrap) return [];
    const tz = bootstrap.profile.timezone;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startKey = todayKey(tz, startDate);

    const byDay = new Map<string, number>();
    for (const tx of bootstrap.transactions) {
      const key = tx.createdAt.slice(0, 10);
      byDay.set(key, (byDay.get(key) ?? 0) + tx.amount);
    }

    let acc = 0;
    byDay.forEach((amount, key) => {
      if (key < startKey) acc += amount;
    });

    const points: { label: string; total: number; earned: number }[] = [];
    for (let i = days; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = todayKey(tz, d);
      const earned = byDay.get(key) ?? 0;
      acc += earned;
      points.push({ label: formatShortDay(key), total: acc, earned });
    }
    return points;
  }, [bootstrap, days]);

  const completionSeries = useMemo(() => {
    if (!bootstrap) return [];
    const today = todayKey(bootstrap.profile.timezone);
    return Array.from({ length: Math.min(days, 14) }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (Math.min(days, 14) - 1 - i));
      const key = todayKey(bootstrap.profile.timezone, d);
      const label = formatShortDay(key);
      const assigned = bootstrap.assignments.filter(
        (a) => a.cadence === 'daily' && a.assignedDate === key,
      ).length;
      const completed = bootstrap.assignments.filter(
        (a) => a.assignedDate === key && a.status === 'completed',
      ).length;
      return {
        label,
        assigned,
        completed,
        rate: assigned > 0 ? Math.round((completed / assigned) * 100) : 0,
        isToday: key === today,
      };
    });
  }, [bootstrap, days]);

  const pathActivity = useMemo(() => {
    if (!bootstrap || !stats) return [];
    return PATHS.map((p) => ({
      name: p.name,
      quests: stats.questsByPath[p.id],
      color: p.color,
    }));
  }, [bootstrap, stats]);

  const summaries = useMemo(() => {
    if (!bootstrap) return null;
    const last = (n: number) => {
      const cutoff = Date.now() - n * 86_400_000;
      return {
        quests: bootstrap.assignments.filter(
          (a) => a.status === 'completed' && a.completedAt && new Date(a.completedAt).getTime() > cutoff,
        ).length,
        xp: bootstrap.transactions
          .filter((tx) => new Date(tx.createdAt).getTime() > cutoff)
          .reduce((s, tx) => s + tx.amount, 0),
        minutes: bootstrap.workouts
          .filter((w) => new Date(w.createdAt).getTime() > cutoff)
          .reduce((s, w) => s + w.durationMinutes, 0),
        lessons: bootstrap.lessons.filter(
          (l) => l.state === 'completed' && l.completedAt && new Date(l.completedAt).getTime() > cutoff,
        ).length,
        reflections: bootstrap.journal.filter(
          (j) => new Date(j.createdAt).getTime() > cutoff,
        ).length,
      };
    };
    const thisWeekKey = weekStart(todayKey(bootstrap.profile.timezone));
    return {
      week: last(7),
      month: last(30),
      thisWeekQuests: bootstrap.assignments.filter(
        (a) => a.status === 'completed' && a.assignedDate >= thisWeekKey,
      ).length,
    };
  }, [bootstrap]);

  const rankHistory = useMemo(
    () =>
      (bootstrap?.events ?? [])
        .filter((e) => e.type === 'rank_up' || e.type === 'level_up')
        .slice(0, 8),
    [bootstrap],
  );

  if (!bootstrap || !stats) return null;

  const level = levelProgress(stats.totalXp);

  if (bootstrap.transactions.length === 0) {
    return (
      <div>
        <PageHeader
          eyebrow="TELEMETRY"
          title="Analytics"
          description="Real charts built from your records — no sample data, ever."
        />
        <EmptyState
          icon={<BarChart3 className="h-8 w-8" aria-hidden />}
          title="Not enough data to chart yet"
          description="Analytics populate as soon as you earn your first XP — complete a quest, log a session or finish a lesson."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="TELEMETRY"
        title="Analytics"
        description="Every chart below is computed from your persisted records in your configured time zone."
        actions={
          <Segmented<Range>
            value={range}
            onChange={setRange}
            options={[
              { value: '7', label: '7 days' },
              { value: '14', label: '14 days' },
              { value: '30', label: '30 days' },
              { value: '90', label: '90 days' },
            ]}
          />
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total XP" value={stats.totalXp.toLocaleString()} sub={`Level ${level.level}`} />
        <Stat
          label={`Last ${days} days`}
          value={`+${xpSeries.reduce((s, p) => s + p.earned, 0)} XP`}
          sub="earned in range"
        />
        <Stat
          label="Completion rate"
          value={`${
            completionSeries.length > 0
              ? Math.round(
                  (completionSeries.reduce((s, d) => s + d.completed, 0) /
                    Math.max(1, completionSeries.reduce((s, d) => s + d.assigned, 0))) *
                    100,
                )
              : 0
          }%`}
          sub="quests assigned vs completed"
        />
        <Stat label="Achievements" value={stats.achievementsEarned} sub="earned" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>XP earned over time</CardTitle>
              <p className="mt-1 text-xs text-muted">Cumulative total across the selected range</p>
            </div>
            <Badge variant="primary">
              <TrendingUp className="h-3 w-3" aria-hidden /> Level {level.level}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={xpSeries} margin={{ top: 6, right: 8, bottom: 0, left: -10 }}>
                  <defs>
                    <linearGradient id="xpFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#292A3D" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#6b6c82', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={28} />
                  <YAxis tick={{ fill: '#6b6c82', fontSize: 10 }} axisLine={false} tickLine={false} width={44} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="total" name="Cumulative XP" stroke="#8B5CF6" strokeWidth={2} fill="url(#xpFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quest completion — daily</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={completionSeries} margin={{ top: 6, right: 8, bottom: 0, left: -24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#292A3D" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#6b6c82', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={20} />
                  <YAxis allowDecimals={false} tick={{ fill: '#6b6c82', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(139,92,246,0.07)' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="assigned" name="Assigned" fill="#4c4d68" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="completed" name="Completed" radius={[3, 3, 0, 0]}>
                    {completionSeries.map((entry, i) => (
                      <Cell key={i} fill={entry.completed >= entry.assigned && entry.assigned > 0 ? '#34d399' : '#8B5CF6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity by development path</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pathActivity} margin={{ top: 6, right: 8, bottom: 0, left: -24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#292A3D" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#6b6c82', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: '#6b6c82', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="quests" name="Quests completed" stroke="#38BDF8" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-3 grid grid-cols-3 gap-2">
              {pathActivity.map((p) => (
                <li key={p.name} className="rounded-lg border border-line/70 bg-abyss/40 px-3 py-2 text-center">
                  <p className="font-mono text-lg font-bold" style={{ color: p.color }}>
                    {p.quests}
                  </p>
                  <p className="text-[0.625rem] uppercase tracking-[0.12em] text-faint">{p.name}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Period summaries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {summaries && (
              <>
                <div>
                  <p className="rune-badge mb-2">THIS WEEK</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Stat label="Quests" value={summaries.week.quests} />
                    <Stat label="XP" value={`+${summaries.week.xp}`} />
                    <Stat label="Minutes" value={summaries.week.minutes} />
                    <Stat label="Lessons" value={summaries.week.lessons} />
                  </div>
                </div>
                <div>
                  <p className="rune-badge mb-2">LAST 30 DAYS</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Stat label="Quests" value={summaries.month.quests} />
                    <Stat label="XP" value={`+${summaries.month.xp}`} />
                    <Stat label="Reflections" value={summaries.month.reflections} />
                    <Stat label="Minutes" value={summaries.month.minutes} />
                  </div>
                </div>
              </>
            )}
            <div className="rounded-xl border border-line/70 bg-abyss/40 px-4 py-3">
              <p className="text-xs leading-relaxed text-muted">
                Streak: <span className="font-semibold text-ink">{stats.currentStreak} days</span>{' '}
                (longest {stats.longestStreak}) · {stats.distinctActiveDays} active days total
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Progression milestones</CardTitle>
              <p className="mt-1 text-xs text-muted">Levels, ranks and achievements</p>
            </div>
            <Award className="h-5 w-5 text-warning" aria-hidden />
          </CardHeader>
          <CardContent>
            {rankHistory.length === 0 ? (
              <p className="text-sm text-muted">
                Milestones appear here the moment you level up or advance in rank.
              </p>
            ) : (
              <ul className="space-y-2">
                {rankHistory.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-line/70 bg-abyss/40 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      {event.type === 'rank_up' ? (
                        <span
                          className="grid h-7 w-7 place-items-center rounded-md font-display text-xs font-bold"
                          style={{
                            color: RANK_COLORS[
                              (event.payload?.to as keyof typeof RANK_COLORS) ?? 'E'
                            ],
                            background: 'rgba(255,255,255,0.04)',
                          }}
                        >
                          {String(event.payload?.to ?? '?')}
                        </span>
                      ) : (
                        <Sparkles className="h-4 w-4 text-primary-soft" aria-hidden />
                      )}
                      <span className="text-sm text-ink">{event.title}</span>
                    </div>
                    <span className="font-mono text-[0.6875rem] text-faint">
                      {formatShortDay(event.createdAt.slice(0, 10))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 border-t border-line/70 pt-4">
              <div className="flex items-center justify-between text-xs text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarCheck2 className="h-3.5 w-3.5 text-highlight" aria-hidden />
                  Achievements earned
                </span>
                <span className="font-mono">
                  {bootstrap.achievements.length} / {Object.keys(ACHIEVEMENT_MAP).length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
