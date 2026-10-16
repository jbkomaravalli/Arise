import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  BookOpen,
  CheckCircle2,
  Circle,
  Flag,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Target,
} from 'lucide-react';
import { useData } from '@/app/DataProvider';
import { useToast } from '@/components/ui/toast';
import type { DevelopmentPath } from '@/core/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DialogContent } from '@/components/ui/dialog';
import { Field, Input, Label, Textarea } from '@/components/ui/form';
import { EmptyState, PageHeader, Segmented, Stat } from '@/components/ui/layout';
import { todayKey } from '@/lib/time';
import { cn } from '@/lib/cn';

const PROMPTS = [
  'What did I accomplish today?',
  'What challenged me today?',
  'What did I learn?',
  'What is my next concrete action?',
];

const FOCUS_PRESETS = [15, 25, 45, 60];

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function FocusTimer() {
  const { recordFocus } = useData();
  const { toast } = useToast();
  const [minutes, setMinutes] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [label, setLabel] = useState('');
  const recordFocusRef = useRef(recordFocus);
  recordFocusRef.current = recordFocus;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          setRunning(false);
          const sessionDate = todayKey(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
          void recordFocusRef
            .current({
              date: sessionDate,
              minutes,
              label: label.trim() || 'Focus session',
              completed: true,
            })
            .then(() =>
              toast({
                title: 'Focus session complete',
                description: `${minutes} minutes banked. DISCIPLINE attribute updated.`,
                variant: 'xp',
              }),
            )
            .catch(() =>
              toast({ title: 'Could not save the session', variant: 'error' }),
            );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, minutes, label, toast]);

  const reset = () => {
    setRunning(false);
    setRemaining(minutes * 60);
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Focus session</CardTitle>
          <p className="mt-1 text-xs text-muted">
            One task. Notifications off. Completed sessions award DISCIPLINE XP.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-5">
          <p
            className={cn(
              'font-mono text-5xl font-bold tabular-nums',
              running ? 'text-gradient-accent' : 'text-ink',
            )}
            aria-live="polite"
          >
            {formatClock(remaining)}
          </p>

          <div className="flex flex-wrap justify-center gap-2">
            {FOCUS_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => {
                  setMinutes(preset);
                  setRemaining(preset * 60);
                  setRunning(false);
                }}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                  minutes === preset
                    ? 'border-primary/50 bg-primary/12 text-ink'
                    : 'border-line bg-abyss/40 text-muted hover:text-ink',
                )}
              >
                {preset} min
              </button>
            ))}
          </div>

          <Input
            aria-label="Focus session label"
            placeholder="What are you working on? (optional)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="max-w-xs text-center"
          />

          <div className="flex gap-3">
            <Button onClick={() => setRunning((v) => !v)} disabled={remaining === 0}>
              {running ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
              {running ? 'Pause' : 'Start'}
            </Button>
            <Button variant="secondary" onClick={reset}>
              <RotateCcw className="h-4 w-4" aria-hidden /> Reset
            </Button>
          </div>

          {remaining === 0 && (
            <p className="text-sm font-medium text-success">Session complete — logged.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function NewGoalDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: { path: DevelopmentPath; title: string; target: string }) => void;
}) {
  const [path, setPath] = useState<DevelopmentPath>('discipline');
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');

  return (
    <DialogContent
      open={open}
      onOpenChange={onOpenChange}
      title="Declare a goal"
      description="Goals are personal objectives you track and close out. Completing one unlocks the Objective Locked achievement."
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim() || !target.trim()) return;
          onCreate({ path, title: title.trim(), target: target.trim() });
          setTitle('');
          setTarget('');
          onOpenChange(false);
        }}
      >
        <div>
          <Label>Development path</Label>
          <Segmented<DevelopmentPath>
            value={path}
            onChange={setPath}
            options={[
              { value: 'vitality', label: 'Vitality' },
              { value: 'intelligence', label: 'Intelligence' },
              { value: 'discipline', label: 'Discipline' },
            ]}
          />
        </div>
        <Field label="Goal" htmlFor="goal-title">
          <Input
            id="goal-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Perform 10 full push-ups"
          />
        </Field>
        <Field label="Definition of done" htmlFor="goal-target">
          <Input
            id="goal-target"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="e.g. 3 clean sets of 10 reps in one session"
          />
        </Field>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={!title.trim() || !target.trim()}>
            Create goal
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

export function MindsetPage() {
  const { bootstrap, stats, addJournal, setGoalStatus, addGoal, recordWorkout } = useData();
  const { toast } = useToast();
  const [reflection, setReflection] = useState('');
  const [promptIndex, setPromptIndex] = useState(0);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const today = bootstrap ? todayKey(bootstrap.profile.timezone) : todayKey('UTC');
  const entriesToday = bootstrap?.journal.filter((j) => j.date === today).length ?? 0;

  const reflections = useMemo(
    () =>
      bootstrap
        ? [...bootstrap.journal].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 30)
        : [],
    [bootstrap],
  );

  const focusMinutes = stats?.focusMinutes ?? 0;

  if (!bootstrap) return null;

  const submitReflection = async () => {
    if (reflection.trim().length < 10) {
      toast({
        title: 'Write a little more',
        description: 'Reflections need at least a sentence to count as evidence.',
        variant: 'error',
      });
      return;
    }
    setBusy(true);
    try {
      await addJournal({
        date: today,
        content: reflection.trim(),
        prompt: PROMPTS[promptIndex],
      });
      setReflection('');
      toast({
        title: 'Reflection recorded',
        description: entriesToday === 0 ? '+10 XP · DISCIPLINE' : 'Saved — one reflection pays XP per day.',
        variant: 'xp',
      });
    } catch (err) {
      toast({
        title: 'Could not save reflection',
        description: err instanceof Error ? err.message : 'Try again.',
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="DISCIPLINE PATH"
        title="Mindset"
        description="Reflections, focus blocks and goals — the operating system behind the other two paths. Everything here is private to your account."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Reflections" value={reflections.length} sub="all time" />
        <Stat label="Today" value={entriesToday} sub={entriesToday > 0 ? 'today' : 'write one below'} />
        <Stat label="Focus minutes" value={focusMinutes} sub="completed sessions" />
        <Stat label="Active goals" value={bootstrap.goals.filter((g) => g.status === 'active').length} sub="declared objectives" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Reflection */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Daily reflection</CardTitle>
              <p className="mt-1 text-xs text-muted">Private to you. Honest beats polished.</p>
            </div>
            {entriesToday > 0 && <Badge variant="success">Done today</Badge>}
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {PROMPTS.map((prompt, index) => (
                <button
                  key={prompt}
                  onClick={() => setPromptIndex(index)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs transition-colors',
                    promptIndex === index
                      ? 'border-primary/50 bg-primary/12 text-ink'
                      : 'border-line bg-abyss/40 text-muted hover:text-ink',
                  )}
                >
                  {prompt}
                </button>
              ))}
            </div>

            <Textarea
              aria-label="Reflection content"
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="Write your answer to the selected prompt…"
              className="min-h-32"
            />

            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-faint">
                Answer all four prompts across your entries — they rotate daily.
              </p>
              <Button size="sm" loading={busy} onClick={() => void submitReflection()}>
                <BookOpen className="h-3.5 w-3.5" aria-hidden /> Save reflection
              </Button>
            </div>

            {reflections.length > 0 && (
              <ul className="mt-5 space-y-2 border-t border-line/70 pt-4">
                {reflections.slice(0, 5).map((entry) => (
                  <li key={entry.id} className="rounded-lg border border-line/60 bg-abyss/40 px-3 py-2.5">
                    {entry.prompt && <p className="rune-badge mb-1 text-[0.625rem]">{entry.prompt}</p>}
                    <p className="text-xs leading-relaxed text-muted">{entry.content}</p>
                    <p className="mt-1 text-[0.625rem] text-faint">
                      {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Focus + recovery */}
        <div className="space-y-5">
          <FocusTimer />

          <Card>
            <CardHeader>
              <CardTitle>Deliberate practice</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted">
              <p>
                <span className="font-semibold text-ink">Practice the weak point, not the
                comfortable part.</span>{' '}
                Isolate the specific thing you do badly, drill it with feedback for 20+ minutes,
                then record what improved.
              </p>
              <p>
                <span className="font-semibold text-ink">Treat failure as data.</span> A missed day
                or failed attempt is information about your system, not a verdict on your character.
                Log it honestly and adjust one variable.
              </p>
              <p>
                <span className="font-semibold text-ink">Recovery is training.</span> Rest days keep
                their streak credit. Never trade sleep or health for extra volume — that is a
                losing trade in every time horizon.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick log</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  void recordWorkout({
                    id: `ws_${Date.now().toString(36)}`,
                    date: today,
                    templateId: null,
                    title: 'Recovery walk',
                    path: 'vitality',
                    focus: ['recovery', 'endurance'],
                    durationMinutes: 20,
                    intensity: 'light',
                    exercises: [],
                    notes: 'Recovery day movement.',
                  }).then(() =>
                    toast({ title: 'Recovery walk logged', variant: 'success' }),
                  )
                }
              >
                <Circle className="h-3.5 w-3.5" aria-hidden /> Log 20-min recovery walk
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Goals */}
      <Card className="mt-5">
        <CardHeader>
          <div>
            <CardTitle>Goals</CardTitle>
            <p className="mt-1 text-xs text-muted">
              Declare the outcome, close it out when the evidence exists.
            </p>
          </div>
          <Button size="sm" onClick={() => setGoalDialogOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden /> New goal
          </Button>
        </CardHeader>
        <CardContent>
          {bootstrap.goals.length === 0 ? (
            <EmptyState
              icon={<Target className="h-8 w-8" aria-hidden />}
              title="No goals declared"
              description="A goal is a concrete outcome you can point to — not a vague intention. Declare one and track it here."
              action={<Button onClick={() => setGoalDialogOpen(true)}>Declare a goal</Button>}
            />
          ) : (
            <ul className="space-y-2">
              {bootstrap.goals.map((goal) => (
                <li
                  key={goal.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line/70 bg-abyss/40 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {goal.status === 'completed' ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden />
                      ) : (
                        <Flag className="h-4 w-4 shrink-0 text-primary-soft" aria-hidden />
                      )}
                      <p
                        className={cn(
                          'text-sm font-semibold text-ink',
                          goal.status === 'completed' && 'line-through opacity-70',
                        )}
                      >
                        {goal.title}
                      </p>
                      <Badge variant="outline" className="capitalize">
                        {goal.path}
                      </Badge>
                    </div>
                    <p className="mt-0.5 pl-6 text-xs text-muted">{goal.target}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={goal.status === 'completed' ? 'ghost' : 'secondary'}
                    onClick={() =>
                      void setGoalStatus(goal.id, goal.status === 'completed' ? 'active' : 'completed')
                    }
                  >
                    {goal.status === 'completed' ? 'Reopen' : 'Mark complete'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {goalDialogOpen && (
        <NewGoalDialog
          open={goalDialogOpen}
          onOpenChange={setGoalDialogOpen}
          onCreate={(input) => {
            void addGoal(input)
              .then(() =>
                toast({ title: 'Goal declared', description: 'Track it to completion below.', variant: 'success' }),
              )
              .catch(() => toast({ title: 'Could not create the goal', variant: 'error' }));
          }}
        />
      )}
    </div>
  );
}
