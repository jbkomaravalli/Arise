import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, Info, TrendingUp } from 'lucide-react';
import { useData } from '@/app/DataProvider';
import { ATTRIBUTES } from '@/core/config';
import { computeAttributeScores, nextMilestone } from '@/core/attributes';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState, PageHeader } from '@/components/ui/layout';
import { ProgressBar } from '@/components/ui/progress';
import { QUEST_TEMPLATES } from '@/content/questTemplates';
import { xpForTemplate } from '@/core/quests';
import { formatShortDay, todayKey } from '@/lib/time';

export function AttributesPage() {
  const { bootstrap } = useData();

  const scores = useMemo(
    () => (bootstrap ? computeAttributeScores(bootstrap.transactions) : []),
    [bootstrap],
  );

  const history = useMemo(() => {
    if (!bootstrap) return [];
    const days = Array.from({ length: 21 }, (_, i) => {
      const offset = i - 20;
      const d = new Date();
      d.setDate(d.getDate() + offset);
      return formatShortDay(todayKey(bootstrap.profile.timezone, d));
    });

    const totals = new Map<string, number>();
    for (const tx of bootstrap.transactions) {
      const weight =
        tx.attributeWeights.strength ??
        tx.attributeWeights.technical ??
        tx.attributeWeights.discipline ??
        0;
      const day = formatShortDay(tx.createdAt.slice(0, 10));
      totals.set(day, (totals.get(day) ?? 0) + tx.amount * weight);
    }
    let acc = 0;
    return days.map((label) => {
      acc += totals.get(label) ?? 0;
      return { label, total: Math.round(acc) };
    });
  }, [bootstrap]);

  if (!bootstrap) return null;

  if (bootstrap.transactions.length === 0) {
    return (
      <div>
        <PageHeader
          eyebrow="CHARACTER SHEET"
          title="Attributes"
          description="Six application-defined indicators derived from your real activity."
        />
        <EmptyState
          icon={<TrendingUp className="h-8 w-8" aria-hidden />}
          title="No attribute data yet"
          description="Attributes are computed from XP transactions — complete quests, lessons, training sessions and reflections, and this sheet fills with real values."
          action={
            <Link to="/app/quests">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-primary-soft">
                View today’s quests <ArrowRight className="h-4 w-4" aria-hidden />
              </span>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="CHARACTER SHEET"
        title="Attributes"
        description="Progress indicators defined by ARISE — not scientific measurements. Every point comes from completed, logged activity."
      />

      <div className="mb-5 flex items-start gap-3 rounded-xl border border-line bg-abyss/50 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-highlight" aria-hidden />
        <p className="text-xs leading-relaxed text-muted">
          Scores follow a smooth curve over attribute XP: <span className="font-mono text-ink">score = 100 × (1 − e^(−xp/600))</span>.
          Attribute XP is assigned by the source of each action — a strength quest builds
          Strength, a lesson builds Technical Knowledge, a reflection builds Discipline.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {ATTRIBUTES.map((attribute) => {
          const score = scores.find((s) => s.attribute === attribute.key);
          const value = score?.value ?? 0;
          const milestone = nextMilestone(attribute.key, value);
          const earned = attribute.milestones.filter((m) => m.at <= value).pop();

          const recommended = QUEST_TEMPLATES.filter(
            (t) => t.path === attribute.path && (t.attributeWeights[attribute.key] ?? 0) >= 0.3,
          )
            .sort((a, b) => xpForTemplate(b) - xpForTemplate(a))
            .slice(0, 2);

          return (
            <Card key={attribute.key}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="rune-badge mb-1">{attribute.shortLabel}</p>
                    <CardTitle>{attribute.label}</CardTitle>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{attribute.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-3xl font-bold text-gradient-accent">{value}</p>
                    <p className="text-[0.625rem] uppercase tracking-[0.16em] text-faint">
                      {Math.round(score?.xp ?? 0)} attr XP
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ProgressBar value={value} label={`${attribute.label} score`} />

                <div className="mt-4 rounded-xl border border-line/70 bg-abyss/40 p-3.5">
                  {earned && (
                    <div className="mb-2 flex items-center justify-between">
                      <Badge variant="primary">{earned.title}</Badge>
                      <span className="text-[0.6875rem] text-faint">achieved at {earned.at}</span>
                    </div>
                  )}
                  {milestone ? (
                    <>
                      <p className="text-xs leading-relaxed text-muted">
                        <span className="font-semibold text-ink">Next: {milestone.milestone.title}</span>{' '}
                        — {milestone.milestone.detail}
                      </p>
                      <ProgressBar
                        value={value}
                        max={milestone.milestone.at}
                        className="mt-2.5 h-1.5"
                        label="Next milestone progress"
                      />
                      <p className="mt-1.5 font-mono text-[0.6875rem] text-faint">
                        {milestone.remaining} points remaining
                      </p>
                    </>
                  ) : (
                    <p className="text-xs leading-relaxed text-muted">
                      Highest tier reached. Keep progressing — the curve keeps recording your work.
                    </p>
                  )}
                </div>

                {recommended.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-faint">
                      Recommended quests
                    </p>
                    <ul className="space-y-1.5">
                      {recommended.map((t) => (
                        <li key={t.id}>
                          <Link
                            to="/app/quests"
                            className="flex items-center justify-between rounded-lg border border-line/60 bg-abyss/30 px-3 py-2 text-xs transition-colors hover:border-primary/40"
                          >
                            <span className="text-muted">{t.title}</span>
                            <span className="font-mono text-primary-soft">+{xpForTemplate(t)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Attribute growth — last 21 days</CardTitle>
          <span className="text-xs text-faint">Cumulative attribute XP</span>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="attrFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fill: '#6b6c82', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={24} />
                <YAxis tick={{ fill: '#6b6c82', fontSize: 10 }} axisLine={false} tickLine={false} width={44} />
                <Tooltip
                  contentStyle={{
                    background: '#171827',
                    border: '1px solid #292A3D',
                    borderRadius: 12,
                    fontSize: 12,
                    color: '#F8FAFC',
                  }}
                />
                <Area type="monotone" dataKey="total" name="Attribute XP" stroke="#8B5CF6" strokeWidth={2} fill="url(#attrFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
