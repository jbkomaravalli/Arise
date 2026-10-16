import { Link } from 'react-router-dom';
import {
  Award,
  CalendarDays,
  Flame,
  Globe,
  Lock,
  Mail,
  MapPin,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/app/AuthProvider';
import { useData } from '@/app/DataProvider';
import { ACHIEVEMENTS } from '@/content';
import { ATTRIBUTES, RANK_COLORS } from '@/core/config';
import { rankStatus } from '@/core/rank';
import { levelProgress } from '@/core/level';
import { AriseMark } from '@/components/brand/Wordmark';
import { RankBadge } from '@/components/RankBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProgressBar, ProgressRing } from '@/components/ui/progress';
import { cn } from '@/lib/cn';

export function ProfilePage() {
  const { bootstrap, stats } = useData();
  const { mode } = useAuth();

  if (!bootstrap || !stats) return null;

  const level = levelProgress(stats.totalXp);
  const rank = rankStatus(stats);
  const initials = bootstrap.profile.displayName
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const earnedIds = new Set(bootstrap.achievements.map((a) => a.achievementId));
  const attributeValues = Object.fromEntries(
    bootstrap.attributes.map((a) => [a.attribute, a.value]),
  ) as Record<(typeof ATTRIBUTES)[number]['key'], number>;

  const nextRankProgress = rank.nextProgress;

  return (
    <div className="space-y-5">
      {/* Identity */}
      <section className="energy-frame arcane-bg overflow-hidden rounded-2xl border border-line bg-surface/70 p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="relative">
            <ProgressRing percent={level.percent} size={120} strokeWidth={9} label="Level progress">
              <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-faint">
                LV
              </span>
              <span className="font-display text-3xl font-bold text-ink">{level.level}</span>
            </ProgressRing>
          </div>

          <div className="min-w-0 flex-1">
            <p className="rune-badge mb-1">HUNTER PROFILE</p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-primary/35 bg-primary/12 font-display text-lg font-bold text-primary-soft">
                {initials || <AriseMark size={30} />}
              </span>
              <div className="min-w-0">
                <h1 className="font-display text-2xl font-bold text-ink">
                  {bootstrap.profile.displayName}
                </h1>
                <p className="flex items-center gap-2 truncate text-sm text-muted">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-faint" aria-hidden />
                  {bootstrap.profile.email}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <RankBadge tier={stats.rank} size="sm" />
              <Badge variant="primary">
                <Flame className="h-3 w-3" aria-hidden /> {stats.currentStreak}-day streak
              </Badge>
              <Badge variant="outline">
                <Globe className="h-3 w-3" aria-hidden /> {bootstrap.profile.timezone}
              </Badge>
              <Badge variant="outline">
                <CalendarDays className="h-3 w-3" aria-hidden />{' '}
                Since {new Date(bootstrap.profile.createdAt).getFullYear()}
              </Badge>
              {mode === 'local' && <Badge variant="warning">Local mode</Badge>}
            </div>

            <div className="mt-5 max-w-lg">
              <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
                <span className="font-mono">{stats.totalXp.toLocaleString()} XP</span>
                <span className="font-mono">
                  {level.isMax ? 'MAX' : `${level.xpToNext} XP to level ${level.level + 1}`}
                </span>
              </div>
              <ProgressBar value={level.xpIntoLevel} max={level.nextThreshold - level.currentThreshold} label="Level progress" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ['Quests', stats.completedQuests],
          ['Active days', stats.distinctActiveDays],
          ['Lessons', stats.lessonsCompleted],
          ['Sessions', stats.workoutsLogged],
          ['Reflections', stats.reflectionsLogged],
          ['Focus min', stats.focusMinutes],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl border border-line/70 bg-abyss/40 px-4 py-3 text-center">
            <p className="font-display text-xl font-bold text-ink">{value}</p>
            <p className="text-[0.625rem] uppercase tracking-[0.14em] text-faint">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Next rank */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div>
              <CardTitle>Next rank</CardTitle>
              <p className="mt-1 text-xs text-muted">
                {rank.next ? `${rank.next.tier} — ${rank.next.name}` : 'Top rank achieved'}
              </p>
            </div>
            <Sparkles className="h-5 w-5 text-primary-soft" aria-hidden />
          </CardHeader>
          <CardContent>
            {!rank.next ? (
              <p className="text-sm leading-relaxed text-muted">
                You hold the highest rank in the system. The only requirement left is to keep
                going.
              </p>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between rounded-xl border border-line/70 bg-abyss/40 px-4 py-3">
                  <span className="font-display text-lg font-bold" style={{ color: RANK_COLORS[stats.rank] }}>
                    {stats.rank}
                  </span>
                  <span className="text-faint">→</span>
                  <span className="font-display text-lg font-bold" style={{ color: RANK_COLORS[rank.next.tier] }}>
                    {rank.next.tier}
                  </span>
                  <span className="font-mono text-sm text-muted">{Math.round(rank.percent)}%</span>
                </div>
                <ul className="space-y-3">
                  {nextRankProgress.map((progress) => (
                    <li key={progress.requirement.label}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className={progress.met ? 'text-success' : 'text-muted'}>
                          {progress.requirement.label}
                        </span>
                        <span className="font-mono text-faint">
                          {Math.min(progress.current, progress.target)} / {progress.target}
                        </span>
                      </div>
                      <ProgressBar
                        value={progress.current}
                        max={progress.target}
                        className="h-1.5"
                        barClassName={progress.met ? 'bg-success' : undefined}
                        label={progress.requirement.label}
                      />
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div className="mt-5 rounded-xl border border-line/70 bg-abyss/40 p-4">
              <p className="rune-badge mb-2">ATTRIBUTE SNAPSHOT</p>
              <ul className="space-y-2">
                {ATTRIBUTES.map((attribute) => (
                  <li key={attribute.key} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-xs text-muted">{attribute.shortLabel}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line/70">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-highlight"
                        style={{ width: `${attributeValues[attribute.key] ?? 0}%` }}
                      />
                    </div>
                    <span className="w-6 text-right font-mono text-xs text-faint">
                      {attributeValues[attribute.key] ?? 0}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Achievements</CardTitle>
              <p className="mt-1 text-xs text-muted">
                {earnedIds.size} of {ACHIEVEMENTS.length} unlocked — awarded from real records only
              </p>
            </div>
            <Award className="h-5 w-5 text-warning" aria-hidden />
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 sm:grid-cols-2">
              {ACHIEVEMENTS.map((def) => {
                const earned = earnedIds.has(def.id);
                const owned = bootstrap.achievements.find((a) => a.achievementId === def.id);
                return (
                  <li
                    key={def.id}
                    className={cn(
                      'flex items-start gap-3 rounded-xl border p-3.5 transition-colors',
                      earned
                        ? 'border-warning/35 bg-warning/8'
                        : 'border-line/70 bg-abyss/30 opacity-75',
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-9 w-9 shrink-0 place-items-center rounded-lg border',
                        earned
                          ? 'border-warning/40 bg-warning/15 text-warning'
                          : 'border-line bg-abyss/60 text-faint',
                      )}
                    >
                      {earned ? (
                        <Award className="h-4 w-4" aria-hidden />
                      ) : (
                        <Lock className="h-3.5 w-3.5" aria-hidden />
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-ink">{def.name}</p>
                        <Badge variant={earned ? 'warning' : 'outline'}>+{def.xpReward}</Badge>
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted">{def.description}</p>
                      {owned && (
                        <p className="mt-1 font-mono text-[0.625rem] text-faint">
                          Earned {new Date(owned.earnedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/60 px-5 py-4">
        <p className="flex items-center gap-2 text-xs text-muted">
          <ShieldCheck className="h-4 w-4 text-success" aria-hidden />
          Your profile and records are private to your account.
        </p>
        <div className="flex gap-3">
          <Link to="/app/settings">
            <Button variant="secondary" size="sm">
              Edit preferences
            </Button>
          </Link>
          <Link to="/app/analytics">
            <Button variant="ghost" size="sm">
              <MapPin className="h-3.5 w-3.5" aria-hidden /> Full analytics
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
