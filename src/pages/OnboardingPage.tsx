import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, Dumbbell, TerminalSquare, Brain } from 'lucide-react';
import { useData } from '@/app/DataProvider';
import { AriseMark } from '@/components/brand/Wordmark';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { Segmented } from '@/components/ui/layout';
import { useToast } from '@/components/ui/toast';
import { PATHS } from '@/core/config';
import type { DevelopmentPath, UserPreferences } from '@/core/types';
import { cn } from '@/lib/cn';
import { detectTimezone } from '@/lib/time';

const PATH_ICONS = { vitality: Dumbbell, intelligence: TerminalSquare, discipline: Brain } as const;

const STEPS = ['Identity', 'Goals', 'Calibration', 'Schedule'] as const;

function MultiChoice<T extends string>({
  options,
  selected,
  onChange,
  min = 1,
}: {
  options: { value: T; label: string; description?: string; icon?: React.ReactNode }[];
  selected: T[];
  onChange: (next: T[]) => void;
  min?: number;
}) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-3">
      {options.map((opt) => {
        const active = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => {
              if (active) {
                if (selected.length > min) onChange(selected.filter((v) => v !== opt.value));
              } else {
                onChange([...selected, opt.value]);
              }
            }}
            className={cn(
              'rounded-xl border p-4 text-left transition-all',
              active
                ? 'border-primary/55 bg-primary/10 shadow-[0_0_24px_-12px_var(--color-primary)]'
                : 'border-line bg-abyss/40 hover:border-primary/30',
            )}
          >
            <div className="flex items-center justify-between">
              <span className={cn(active ? 'text-primary-soft' : 'text-muted')}>{opt.icon}</span>
              {active && <Check className="h-4 w-4 text-primary-soft" aria-hidden />}
            </div>
            <p className="mt-2.5 text-sm font-semibold text-ink">{opt.label}</p>
            {opt.description && <p className="mt-1 text-xs leading-relaxed text-muted">{opt.description}</p>}
          </button>
        );
      })}
    </div>
  );
}

export function OnboardingPage() {
  const { bootstrap, completeOnboarding } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const reducedMotion = useReducedMotion();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState(bootstrap?.profile.displayName ?? '');
  const [timezone, setTimezone] = useState(() => bootstrap?.profile.timezone || detectTimezone());
  const [paths, setPaths] = useState<DevelopmentPath[]>([
    'vitality',
    'intelligence',
    'discipline',
  ]);
  const [dailyMinutes, setDailyMinutes] = useState(45);
  const [dailyQuestCount, setDailyQuestCount] = useState(5);
  const [fitnessLevel, setFitnessLevel] = useState<UserPreferences['fitnessLevel']>('new');
  const [techLevel, setTechLevel] = useState<UserPreferences['techLevel']>('new');
  const [difficulty, setDifficulty] = useState<UserPreferences['difficulty']>('adaptive');
  const [trainingIntensity, setTrainingIntensity] =
    useState<UserPreferences['trainingIntensity']>('moderate');
  const [restDays, setRestDays] = useState<number[]>([0]);

  const canContinue = useMemo(() => {
    if (step === 0) return displayName.trim().length >= 2 && timezone.trim().length > 0;
    return true;
  }, [step, displayName, timezone]);

  const finish = async () => {
    setSaving(true);
    try {
      await completeOnboarding({
        displayName: displayName.trim(),
        timezone,
        preferences: {
          activePaths:
            paths.length > 0
              ? paths
              : (['vitality', 'intelligence', 'discipline'] as DevelopmentPath[]),
          dailyMinutes,
          dailyQuestCount,
          fitnessLevel,
          techLevel,
          difficulty,
          trainingIntensity,
          restDays,
        } as Partial<UserPreferences>,
      });
      toast({ title: 'Profile initialized', description: 'Your first quests are being assigned.', variant: 'success' });
      navigate('/app', { replace: true });
    } catch (err) {
      toast({
        title: 'Could not save your profile',
        description: err instanceof Error ? err.message : 'Try again.',
        variant: 'error',
      });
      setSaving(false);
    }
  };

  return (
    <div className="arcane-bg min-h-dvh bg-void px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <span className="inline-flex items-center gap-2.5">
            <AriseMark size={28} />
            <span className="font-display text-sm font-bold tracking-[0.3em] text-ink">ARISE</span>
          </span>
          <span className="font-mono text-xs text-faint">
            STEP {step + 1} / {STEPS.length}
          </span>
        </div>

        <div className="mb-8 flex gap-1.5">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1">
              <div
                className={cn(
                  'h-1 rounded-full transition-colors',
                  i <= step ? 'bg-primary' : 'bg-line',
                )}
              />
              <p
                className={cn(
                  'mt-2 text-[0.625rem] font-medium uppercase tracking-[0.14em]',
                  i <= step ? 'text-primary-soft' : 'text-faint',
                )}
              >
                {label}
              </p>
            </div>
          ))}
        </div>

        <div className="energy-frame rounded-3xl border border-line bg-surface/85 p-6 shadow-pop sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -24 }}
              transition={{ duration: 0.22 }}
            >
              {step === 0 && (
                <section>
                  <p className="rune-badge mb-2">IDENTITY</p>
                  <h1 className="font-display text-2xl font-bold text-ink">
                    How should the system address you?
                  </h1>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    Only these details are stored: a display name, your time zone and your
                    preferences. Everything else is earned through your records.
                  </p>
                  <div className="mt-6 space-y-5">
                    <Field label="Display name" htmlFor="ob-name" hint="required">
                      <Input
                        id="ob-name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. Sungjin"
                        maxLength={60}
                      />
                    </Field>
                    <Field
                      label="Time zone"
                      htmlFor="ob-tz"
                      hint="used for daily quests and streaks"
                    >
                      <Input
                        id="ob-tz"
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        placeholder="e.g. Europe/Berlin"
                      />
                    </Field>
                    <button
                      type="button"
                      onClick={() => setTimezone(detectTimezone())}
                      className="text-xs font-medium text-primary-soft hover:text-highlight"
                    >
                      Use my detected time zone ({detectTimezone()})
                    </button>
                  </div>
                </section>
              )}

              {step === 1 && (
                <section>
                  <p className="rune-badge mb-2">GOALS</p>
                  <h1 className="font-display text-2xl font-bold text-ink">
                    Which paths will you walk?
                  </h1>
                  <p className="mb-6 mt-2 text-sm leading-relaxed text-muted">
                    Active paths receive daily quests. Balanced progress across all three is
                    required for higher ranks.
                  </p>
                  <MultiChoice<DevelopmentPath>
                    options={PATHS.map((p) => {
                      const Icon = PATH_ICONS[p.id];
                      return {
                        value: p.id,
                        label: p.name,
                        description: p.tagline,
                        icon: <Icon className="h-5 w-5" aria-hidden />,
                      };
                    })}
                    selected={paths}
                    onChange={setPaths}
                  />
                  <div className="mt-7 grid gap-5 sm:grid-cols-2">
                    <Field label="Daily time budget" htmlFor="ob-minutes" hint={`${dailyMinutes} min`}>
                      <input
                        id="ob-minutes"
                        type="range"
                        min={15}
                        max={120}
                        step={5}
                        value={dailyMinutes}
                        onChange={(e) => setDailyMinutes(Number(e.target.value))}
                        className="mt-3 w-full accent-[var(--color-primary)]"
                      />
                    </Field>
                    <Field label="Quests per day" htmlFor="ob-count" hint={`${dailyQuestCount} quests`}>
                      <input
                        id="ob-count"
                        type="range"
                        min={3}
                        max={7}
                        value={dailyQuestCount}
                        onChange={(e) => setDailyQuestCount(Number(e.target.value))}
                        className="mt-3 w-full accent-[var(--color-primary)]"
                      />
                    </Field>
                  </div>
                </section>
              )}

              {step === 2 && (
                <section>
                  <p className="rune-badge mb-2">CALIBRATION</p>
                  <h1 className="font-display text-2xl font-bold text-ink">
                    Where are you starting from?
                  </h1>
                  <p className="mb-6 mt-2 text-sm leading-relaxed text-muted">
                    Honest answers pick appropriate quest difficulty. You can change these anytime
                    in Settings.
                  </p>
                  <div className="space-y-6">
                    <div>
                      <p className="mb-2 text-[0.8125rem] font-medium text-ink">Fitness experience</p>
                      <Segmented
                        value={fitnessLevel}
                        onChange={setFitnessLevel}
                        options={[
                          { value: 'new', label: 'Brand new' },
                          { value: 'returning', label: 'Returning' },
                          { value: 'regular', label: 'Training regularly' },
                        ]}
                      />
                    </div>
                    <div>
                      <p className="mb-2 text-[0.8125rem] font-medium text-ink">Technical background</p>
                      <Segmented
                        value={techLevel}
                        onChange={setTechLevel}
                        options={[
                          { value: 'new', label: 'New to Linux' },
                          { value: 'some', label: 'Some experience' },
                          { value: 'comfortable', label: 'Comfortable' },
                        ]}
                      />
                    </div>
                    <div>
                      <p className="mb-2 text-[0.8125rem] font-medium text-ink">Quest difficulty</p>
                      <Segmented
                        value={difficulty}
                        onChange={setDifficulty}
                        options={[
                          { value: 'adaptive', label: 'Adaptive (recommended)' },
                          { value: 'easy', label: 'Easy' },
                          { value: 'medium', label: 'Medium' },
                          { value: 'hard', label: 'Hard' },
                        ]}
                      />
                    </div>
                    <div>
                      <p className="mb-2 text-[0.8125rem] font-medium text-ink">Training intensity</p>
                      <Segmented
                        value={trainingIntensity}
                        onChange={setTrainingIntensity}
                        options={[
                          { value: 'light', label: 'Light' },
                          { value: 'moderate', label: 'Moderate' },
                          { value: 'rigorous', label: 'Rigorous' },
                        ]}
                      />
                    </div>
                  </div>
                </section>
              )}

              {step === 3 && (
                <section>
                  <p className="rune-badge mb-2">SCHEDULE</p>
                  <h1 className="font-display text-2xl font-bold text-ink">
                    When do you plan to rest?
                  </h1>
                  <p className="mb-6 mt-2 text-sm leading-relaxed text-muted">
                    Rest days are legitimate training days. They never break your streak — they
                    are treated as planned recovery.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, index) => {
                      const active = restDays.includes(index);
                      return (
                        <button
                          key={label}
                          type="button"
                          aria-pressed={active}
                          onClick={() =>
                            setRestDays((prev) =>
                              prev.includes(index) ? prev.filter((d) => d !== index) : [...prev, index],
                            )
                          }
                          className={cn(
                            'h-11 min-w-14 rounded-xl border px-3 text-sm font-medium transition-colors',
                            active
                              ? 'border-primary/50 bg-primary/12 text-ink'
                              : 'border-line bg-abyss/40 text-muted hover:text-ink',
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-7 rounded-xl border border-line bg-abyss/50 p-4">
                    <p className="rune-badge mb-2">SYSTEM SUMMARY</p>
                    <ul className="space-y-1.5 text-sm text-muted">
                      <li>
                        Hunter: <span className="text-ink">{displayName || 'Hunter'}</span> ·{' '}
                        <span className="font-mono text-xs">{timezone}</span>
                      </li>
                      <li>
                        Paths:{' '}
                        <span className="text-ink">
                          {paths.map((p) => PATHS.find((x) => x.id === p)?.name).join(' · ') || '—'}
                        </span>
                      </li>
                      <li>
                        Plan: <span className="text-ink">{dailyQuestCount} quests/day</span> ·{' '}
                        <span className="text-ink">{dailyMinutes} min/day</span> ·{' '}
                        <span className="text-ink">{difficulty} difficulty</span>
                      </li>
                      <li>
                        Rest days:{' '}
                        <span className="text-ink">
                          {restDays.length === 0
                            ? 'None selected'
                            : restDays.map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}
                        </span>
                      </li>
                    </ul>
                  </div>
                </section>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || saving}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden /> Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canContinue}>
                Continue <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            ) : (
              <Button onClick={() => void finish()} loading={saving}>
                <Check className="h-4 w-4" aria-hidden /> Initialize profile
              </Button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-faint">
          Optional fields can be changed later in Settings. Nothing here is shared publicly.
        </p>
      </div>
    </div>
  );
}
