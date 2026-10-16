import { useMemo, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  Dumbbell,
  Footprints,
  HeartPulse,
  Plus,
  Timer,
  Trash2,
  Trophy,
} from 'lucide-react';
import { useData } from '@/app/DataProvider';
import { useToast } from '@/components/ui/toast';
import { WORKOUT_TEMPLATES, type WorkoutTemplate } from '@/content/workouts';
import type { DevelopmentPath, WorkoutExercise } from '@/core/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DialogContent } from '@/components/ui/dialog';
import { Field, Input, Label, Select, Textarea } from '@/components/ui/form';
import { EmptyState, PageHeader, Stat } from '@/components/ui/layout';
import { addDays, formatDayKey, formatShortDay, todayKey } from '@/lib/time';
import { cn } from '@/lib/cn';

const FOCUS_OPTIONS = ['strength', 'endurance', 'mobility', 'core', 'recovery'];

function LogWorkoutDialog({
  open,
  onOpenChange,
  template,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: WorkoutTemplate | null;
  onSubmit: (session: {
    id: string;
    date: string;
    templateId: string | null;
    title: string;
    path: DevelopmentPath;
    focus: string[];
    durationMinutes: number;
    intensity: 'light' | 'moderate' | 'vigorous';
    exercises: WorkoutExercise[];
    notes?: string;
  }) => Promise<void>;
}) {
  const { bootstrap } = useData();
  const today = bootstrap ? todayKey(bootstrap.profile.timezone) : todayKey('UTC');
  const [date, setDate] = useState(today);
  const [title, setTitle] = useState(template?.title ?? '');
  const [duration, setDuration] = useState(template?.minutes ?? 30);
  const [intensity, setIntensity] = useState<'light' | 'moderate' | 'vigorous'>(
    template?.intensity ?? 'moderate',
  );
  const [focus, setFocus] = useState<string[]>(template?.focus ?? ['strength']);
  const [exercises, setExercises] = useState<WorkoutExercise[]>(
    template?.exercises.map((e) => ({ name: e.name, sets: e.sets, reps: e.reps })) ?? [],
  );
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const path: DevelopmentPath = 'vitality';

  return (
    <DialogContent
      open={open}
      onOpenChange={onOpenChange}
      title={template ? template.title : 'Log a training session'}
      description="Sessions feed Vitality quests, achievements and your Strength, Endurance and Mobility attributes."
      className="max-h-[90dvh] overflow-y-auto"
    >
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await onSubmit({
              id: `ws_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
              date,
              templateId: template?.id ?? null,
              title: title.trim() || template?.title || 'Training session',
              path,
              focus,
              durationMinutes: duration,
              intensity,
              exercises: exercises.filter((e) => e.name.trim().length > 0),
              notes: notes.trim() || undefined,
            });
            onOpenChange(false);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save the session.');
          } finally {
            setBusy(false);
          }
        }}
      >
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date" htmlFor="w-date">
            <Input
              id="w-date"
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field label="Title" htmlFor="w-title">
            <Input
              id="w-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Full-body foundation"
            />
          </Field>
          <Field label="Duration (minutes)" htmlFor="w-duration">
            <Input
              id="w-duration"
              type="number"
              min={5}
              max={240}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </Field>
          <Field label="Intensity" htmlFor="w-intensity">
            <Select
              id="w-intensity"
              value={intensity}
              onChange={(e) => setIntensity(e.target.value as 'light' | 'moderate' | 'vigorous')}
            >
              <option value="light">Light</option>
              <option value="moderate">Moderate</option>
              <option value="vigorous">Vigorous</option>
            </Select>
          </Field>
        </div>

        <div>
          <Label>Focus</Label>
          <div className="flex flex-wrap gap-2">
            {FOCUS_OPTIONS.map((option) => {
              const active = focus.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    setFocus((prev) =>
                      prev.includes(option) ? prev.filter((f) => f !== option) : [...prev, option],
                    )
                  }
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                    active
                      ? 'border-primary/50 bg-primary/12 text-ink'
                      : 'border-line bg-abyss/40 text-muted hover:text-ink',
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label className="mb-0">Exercises</Label>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setExercises((prev) => [...prev, { name: '', sets: 3, reps: '' }])}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden /> Add exercise
            </Button>
          </div>
          <div className="space-y-2">
            {exercises.map((exercise, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  aria-label={`Exercise ${index + 1} name`}
                  placeholder="Exercise"
                  value={exercise.name}
                  onChange={(e) =>
                    setExercises((prev) =>
                      prev.map((x, i) => (i === index ? { ...x, name: e.target.value } : x)),
                    )
                  }
                  className="flex-1"
                />
                <Input
                  aria-label={`Exercise ${index + 1} sets`}
                  type="number"
                  min={1}
                  max={20}
                  value={exercise.sets ?? 3}
                  onChange={(e) =>
                    setExercises((prev) =>
                      prev.map((x, i) =>
                        i === index ? { ...x, sets: Number(e.target.value) } : x,
                      ),
                    )
                  }
                  className="w-16"
                />
                <Input
                  aria-label={`Exercise ${index + 1} reps`}
                  placeholder="8–12"
                  value={exercise.reps ?? ''}
                  onChange={(e) =>
                    setExercises((prev) =>
                      prev.map((x, i) => (i === index ? { ...x, reps: e.target.value } : x)),
                    )
                  }
                  className="w-24"
                />
                <button
                  type="button"
                  aria-label={`Remove exercise ${index + 1}`}
                  onClick={() => setExercises((prev) => prev.filter((_, i) => i !== index))}
                  className="rounded-lg p-2 text-faint transition-colors hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            ))}
            {exercises.length === 0 && (
              <p className="text-xs text-faint">No exercises yet — add the movements you did.</p>
            )}
          </div>
        </div>

        <Field label="Notes" htmlFor="w-notes" hint="private">
          <Textarea
            id="w-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How it felt, what to adjust next time, any pain to watch."
            className="min-h-20"
          />
        </Field>

        {template?.safety && (
          <p className="rounded-lg border border-line bg-abyss/50 px-3 py-2 text-xs leading-relaxed text-muted">
            {template.safety}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Log session
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

export function TrainingPage() {
  const { bootstrap, recordWorkout } = useData();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<WorkoutTemplate | null>(null);

  const sessions = useMemo(
    () =>
      bootstrap
        ? [...bootstrap.workouts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 40)
        : [],
    [bootstrap],
  );

  const weeklyMinutes = useMemo(() => {
    if (!bootstrap) return [];
    const dayKey = todayKey(bootstrap.profile.timezone);
    return Array.from({ length: 7 }, (_, i) => {
      const key = addDays(dayKey, i - 6);
      const minutes = bootstrap.workouts
        .filter((w) => w.date === key)
        .reduce((sum, w) => sum + w.durationMinutes, 0);
      return { label: formatShortDay(key), minutes };
    });
  }, [bootstrap]);

  if (!bootstrap) return null;

  const totals = {
    sessions: bootstrap.workouts.length,
    minutes: bootstrap.workouts.reduce((sum, w) => sum + w.durationMinutes, 0),
    longest: bootstrap.workouts.reduce((max, w) => Math.max(max, w.durationMinutes), 0),
    thisWeek: weeklyMinutes.reduce((sum, d) => sum + d.minutes, 0),
  };

  const handleLog = async (session: Parameters<typeof recordWorkout>[0]) => {
    await recordWorkout(session);
    toast({
      title: 'Session logged',
      description: 'Training history, attributes and achievements updated.',
      variant: 'success',
    });
  };

  return (
    <div>
      <PageHeader
        eyebrow="VITALITY PATH"
        title="Training"
        description="Beginner-friendly progressive calisthenics with rest treated as part of the plan. Every session feeds your Strength, Endurance and Mobility attributes."
        actions={
          <Button
            onClick={() => {
              setActiveTemplate(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" aria-hidden /> Log workout
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Sessions logged" value={totals.sessions} sub="all time" />
        <Stat label="Total minutes" value={totals.minutes.toLocaleString()} sub="all time" />
        <Stat label="This week" value={`${totals.thisWeek} min`} sub="last 7 days" />
        <Stat label="Longest session" value={`${totals.longest} min`} sub="personal record" />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Weekly activity — minutes trained</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyMinutes} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="trainFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
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
                <Area type="monotone" dataKey="minutes" name="Minutes" stroke="#34d399" strokeWidth={2} fill="url(#trainFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <h2 className="mb-3 font-display text-lg font-semibold text-ink">Workout templates</h2>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {WORKOUT_TEMPLATES.map((template) => (
          <div
            key={template.id}
            className="group flex flex-col rounded-2xl border border-line bg-surface/70 p-5 transition-colors hover:border-primary/40"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-success/30 bg-success/10">
                {template.focus.includes('mobility') ? (
                  <HeartPulse className="h-5 w-5 text-success" aria-hidden />
                ) : template.focus.includes('endurance') ? (
                  <Footprints className="h-5 w-5 text-success" aria-hidden />
                ) : (
                  <Dumbbell className="h-5 w-5 text-success" aria-hidden />
                )}
              </span>
              <Badge variant="outline">{template.intensity}</Badge>
            </div>
            <h3 className="mt-3 font-display text-base font-semibold text-ink">{template.title}</h3>
            <p className="mt-1 flex-1 text-sm leading-relaxed text-muted">{template.summary}</p>
            <div className="mt-3 flex items-center gap-3 text-xs text-faint">
              <span className="inline-flex items-center gap-1.5">
                <Timer className="h-3.5 w-3.5" aria-hidden /> {template.minutes} min
              </span>
              <span>{template.exercises.length} exercises</span>
              <span className="capitalize">{template.level}</span>
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="mt-4 w-full"
              onClick={() => {
                setActiveTemplate(template);
                setDialogOpen(true);
              }}
            >
              Use template
            </Button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="mb-3 font-display text-lg font-semibold text-ink">History</h2>
        <Badge variant="outline">
          <Trophy className="h-3 w-3" aria-hidden /> {totals.sessions} sessions
        </Badge>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          icon={<Dumbbell className="h-8 w-8" aria-hidden />}
          title="No sessions logged yet"
          description="Log your first session — even a 15-minute beginner routine counts. Rest days are legitimate parts of the plan and are never punished."
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden /> Log workout
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {sessions.map((session) => (
            <li key={session.id} className="rounded-2xl border border-line bg-surface/70 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-sm font-semibold text-ink">{session.title}</h3>
                    <Badge variant="outline">{session.intensity}</Badge>
                    {session.focus.map((f) => (
                      <Badge key={f} variant="success" className="capitalize">
                        {f}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-faint">{formatDayKey(session.date)}</p>
                </div>
                <span className="font-mono text-sm font-bold text-primary-soft">
                  {session.durationMinutes} min
                </span>
              </div>

              {session.exercises.length > 0 && (
                <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                  {session.exercises.map((exercise, index) => (
                    <li key={`${session.id}-${index}`} className="flex items-center gap-2 text-xs text-muted">
                      <span className="h-1 w-1 shrink-0 rounded-full bg-primary/60" aria-hidden />
                      <span className="font-medium text-ink">{exercise.name}</span>
                      <span className="font-mono text-faint">
                        {exercise.sets ? `${exercise.sets}×` : ''}
                        {exercise.reps ?? ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {session.notes && (
                <p className="mt-3 rounded-lg border border-line/60 bg-abyss/40 px-3 py-2 text-xs leading-relaxed text-muted">
                  {session.notes}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {dialogOpen && (
        <LogWorkoutDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          template={activeTemplate}
          onSubmit={handleLog}
        />
      )}
    </div>
  );
}
