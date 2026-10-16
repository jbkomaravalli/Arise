import { useMemo, useState } from 'react';
import { Check, CircleDot, Flame, Lock, Minus } from 'lucide-react';
import { useData } from '@/app/DataProvider';
import { SKILLS } from '@/content/skills';
import { computeSkillStates, type SkillViewState } from '@/core/skills';
import { ATTRIBUTES, PATHS } from '@/core/config';
import type { DevelopmentPath, SkillState } from '@/core/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DialogContent } from '@/components/ui/dialog';
import { EmptyState, PageHeader, Segmented } from '@/components/ui/layout';
import { ProgressBar } from '@/components/ui/progress';
import { cn } from '@/lib/cn';

const STATE_STYLE: Record<SkillState, { border: string; bg: string; text: string; icon: typeof Check }> = {
  locked: { border: 'border-line/60', bg: 'bg-abyss/30', text: 'text-faint', icon: Lock },
  available: { border: 'border-highlight/45', bg: 'bg-highlight/8', text: 'text-highlight', icon: CircleDot },
  in_progress: { border: 'border-primary/50', bg: 'bg-primary/10', text: 'text-primary-soft', icon: Flame },
  completed: { border: 'border-success/45', bg: 'bg-success/10', text: 'text-success', icon: Check },
};

function measureLabel(view: SkillViewState): string {
  const m = view.def.measure;
  switch (m.kind) {
    case 'quests':
      return `${m.target} ${m.path} quests`;
    case 'lessons':
      return `${m.target} Academy lessons${m.paths ? ` (${m.paths.join(', ')})` : ''}`;
    case 'workouts':
      return `${m.target} training sessions`;
    case 'journal':
      return `${m.target} reflections`;
    case 'focusMinutes':
      return `${m.target} focus minutes`;
    case 'attribute':
      return `${ATTRIBUTES.find((a) => a.key === m.attribute)?.label ?? m.attribute} ${m.target}`;
    case 'streak':
      return `${m.target}-day streak`;
  }
}

function SkillNode({
  view,
  onSelect,
  all,
}: {
  view: SkillViewState;
  onSelect: (view: SkillViewState) => void;
  all: SkillViewState[];
}) {
  const style = STATE_STYLE[view.state];
  const Icon = style.icon;
  const prereqTitles = view.def.prerequisites
    .map((id) => all.find((s) => s.def.id === id)?.def.title)
    .filter(Boolean) as string[];

  return (
    <button
      onClick={() => onSelect(view)}
      style={{ gridColumn: view.def.column + 1, gridRow: view.def.row + 1 }}
      className={cn(
        'group flex min-h-24 w-full flex-col rounded-xl border p-3 text-left transition-all',
        style.border,
        style.bg,
        view.state !== 'locked' && 'hover:-translate-y-0.5 hover:border-primary/50',
        view.state === 'locked' && 'opacity-75',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cn('text-[0.625rem] font-semibold uppercase tracking-[0.14em]', style.text)}>
          {view.state.replace('_', ' ')}
        </span>
        <Icon className={cn('h-3.5 w-3.5 shrink-0', style.text)} aria-hidden />
      </div>
      <p className="mt-1.5 text-sm font-semibold leading-snug text-ink">{view.def.title}</p>
      <p className="mt-0.5 line-clamp-2 text-[0.6875rem] leading-snug text-muted">
        {view.state === 'locked' && prereqTitles.length > 0
          ? `Requires: ${prereqTitles.join(', ')}`
          : view.def.summary}
      </p>
      {view.state !== 'locked' && view.state !== 'completed' && (
        <ProgressBar
          value={view.current}
          max={view.target}
          className="mt-auto h-1 pt-2"
          label={`${view.def.title} progress`}
        />
      )}
    </button>
  );
}

export function SkillsPage() {
  const { bootstrap, stats } = useData();
  const [filter, setFilter] = useState<DevelopmentPath | 'all'>('all');
  const [selected, setSelected] = useState<SkillViewState | null>(null);

  const views = useMemo(() => {
    if (!bootstrap || !stats) return [];
    const attributeValues = Object.fromEntries(
      bootstrap.attributes.map((a) => [a.attribute, a.value]),
    ) as Record<(typeof ATTRIBUTES)[number]['key'], number>;
    return computeSkillStates({
      definitions: SKILLS,
      owned: bootstrap.skills,
      stats,
      attributeValues,
      lessons: bootstrap.lessons,
    });
  }, [bootstrap, stats]);

  if (!bootstrap) return null;

  const visiblePaths = PATHS.filter((p) => filter === 'all' || p.id === filter);
  const completedCount = views.filter((v) => v.state === 'completed').length;

  return (
    <div>
      <PageHeader
        eyebrow="CAPABILITY MAP"
        title="Skill Tree"
        description="Skills unlock through prerequisites and complete automatically when the underlying evidence exists — quests completed, lessons passed, sessions logged."
        actions={
          <Segmented<DevelopmentPath | 'all'>
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All paths' },
              { value: 'vitality', label: 'Vitality' },
              { value: 'intelligence', label: 'Intelligence' },
              { value: 'discipline', label: 'Discipline' },
            ]}
          />
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-4 text-xs text-muted">
        <span className="font-mono">
          {completedCount} / {views.length} mastered
        </span>
        {(Object.keys(STATE_STYLE) as SkillState[]).map((state) => (
          <span key={state} className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                'h-2.5 w-2.5 rounded-sm border',
                STATE_STYLE[state].border,
                STATE_STYLE[state].bg,
              )}
              aria-hidden
            />
            {state.replace('_', ' ')}
          </span>
        ))}
      </div>

      {views.length === 0 ? (
        <EmptyState
          title="Skill trees are loading"
          description="Complete your profile setup to generate the capability map."
        />
      ) : (
        <div className="space-y-5">
          {visiblePaths.map((path) => {
            const pathViews = views.filter((v) => v.def.path === path.id);
            const rows = Math.max(...pathViews.map((v) => v.def.row)) + 1;
            const cols = Math.max(...pathViews.map((v) => v.def.column)) + 1;
            return (
              <Card key={path.id}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <span
                      className="h-8 w-1 rounded-full"
                      style={{ background: path.color }}
                      aria-hidden
                    />
                    <div>
                      <CardTitle>{path.name}</CardTitle>
                      <p className="text-xs text-muted">{path.tagline}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-transparent" style={{ color: path.color }}>
                    {pathViews.filter((v) => v.state === 'completed').length}/{pathViews.length}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div
                    className="grid gap-3 overflow-x-auto"
                    style={{
                      gridTemplateColumns: `repeat(${cols}, minmax(11rem, 1fr))`,
                      gridTemplateRows: `repeat(${rows}, auto)`,
                    }}
                  >
                    {pathViews.map((view) => (
                      <SkillNode key={view.def.id} view={view} onSelect={setSelected} all={views} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selected && (
          <DialogContent
            open={Boolean(selected)}
            onOpenChange={(open) => !open && setSelected(null)}
            title={selected.def.title}
            description={selected.def.summary}
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    selected.state === 'completed'
                      ? 'success'
                      : selected.state === 'locked'
                        ? 'default'
                        : 'primary'
                  }
                >
                  {selected.state.replace('_', ' ')}
                </Badge>
                <Badge variant="outline">
                  {PATHS.find((p) => p.id === selected.def.path)?.name}
                </Badge>
              </div>

              <div className="rounded-xl border border-line bg-abyss/50 p-4">
                <p className="rune-badge mb-1.5">HOW TO UNLOCK</p>
                <p className="text-sm leading-relaxed text-muted">{selected.def.unlockHint}</p>
                {selected.def.prerequisites.length > 0 && (
                  <p className="mt-2 text-xs text-faint">
                    Prerequisites:{' '}
                    {selected.def.prerequisites
                      .map((id) => views.find((v) => v.def.id === id)?.def.title ?? id)
                      .join(', ')}
                  </p>
                )}
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
                  <span>{measureLabel(selected)}</span>
                  <span className="font-mono">
                    {Math.min(selected.current, selected.target)} / {selected.target}
                  </span>
                </div>
                <ProgressBar value={selected.current} max={selected.target} label="Skill progress" />
              </div>

              {selected.state === 'completed' && (
                <p className="flex items-center gap-2 text-sm font-medium text-success">
                  <Minus className="hidden" aria-hidden />
                  <Check className="h-4 w-4" aria-hidden /> Mastered — derived from your records.
                </p>
              )}
            </div>
          </DialogContent>
      )}
    </div>
  );
}
