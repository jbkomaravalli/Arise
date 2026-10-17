import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  Download,
  LogOut,
  Monitor,
  Palette,
  ShieldAlert,
  Trash2,
  UserCog,
} from 'lucide-react';
import { useAuth } from '@/app/AuthProvider';
import { useData } from '@/app/DataProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DialogContent } from '@/components/ui/dialog';
import { Field, Input, Label } from '@/components/ui/form';
import { PageHeader, Segmented } from '@/components/ui/layout';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import type { Difficulty, UserPreferences } from '@/core/types';
import { cn } from '@/lib/cn';

const ACCENTS: { value: UserPreferences['accent']; label: string; swatch: string }[] = [
  { value: 'violet', label: 'Violet', swatch: '#8B5CF6' },
  { value: 'indigo', label: 'Indigo', swatch: '#6366F1' },
  { value: 'cyan', label: 'Cyan', swatch: '#38BDF8' },
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-abyss/60 text-primary-soft">
            {icon}
          </span>
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="mt-0.5 text-xs text-muted">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );
}

export function SettingsPage() {
  const { bootstrap, savePreferences, updateProfile, exportData, deleteAccount } = useData();
  const { signOut, mode, capabilities } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(bootstrap?.profile.displayName ?? '');
  const [timezone, setTimezone] = useState(bootstrap?.profile.timezone ?? 'UTC');
  const [savingProfile, setSavingProfile] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  if (!bootstrap) return null;
  const prefs = bootstrap.profile.preferences;

  const patch = async (changes: Partial<UserPreferences>) => {
    try {
      await savePreferences(changes);
      toast({ title: 'Preference saved', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Could not save preference',
        description: err instanceof Error ? err.message : 'Try again.',
        variant: 'error',
      });
    }
  };

  const handleExport = async () => {
    try {
      const json = await exportData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `arise-export-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Export downloaded', description: 'Your complete record set as JSON.', variant: 'success' });
    } catch (err) {
      toast({ title: 'Export failed', description: err instanceof Error ? err.message : undefined, variant: 'error' });
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="SYSTEM CONFIGURATION"
        title="Settings"
        description="Preferences persist to your account and change how the system behaves for you."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Section icon={<UserCog className="h-4.5 w-4.5" aria-hidden />} title="Profile" description="Identity and time zone used for daily quests and streaks.">
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setSavingProfile(true);
              try {
                await updateProfile({ displayName, timezone });
                toast({ title: 'Profile updated', variant: 'success' });
              } catch (err) {
                toast({
                  title: 'Could not update profile',
                  description: err instanceof Error ? err.message : undefined,
                  variant: 'error',
                });
              } finally {
                setSavingProfile(false);
              }
            }}
          >
            <Field label="Display name" htmlFor="set-name">
              <Input id="set-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} />
            </Field>
            <Field label="Time zone" htmlFor="set-tz" hint="IANA name, e.g. Europe/Berlin">
              <Input id="set-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
            </Field>
            <Button type="submit" size="sm" loading={savingProfile}>
              <Check className="h-4 w-4" aria-hidden /> Save profile
            </Button>
          </form>
        </Section>

        <Section icon={<Palette className="h-4.5 w-4.5" aria-hidden />} title="Appearance" description="Accent, surface and motion preferences for this account.">
          <div>
            <Label>Accent color</Label>
            <div className="flex gap-2">
              {ACCENTS.map((accent) => (
                <button
                  key={accent.value}
                  onClick={() => void patch({ accent: accent.value })}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm transition-colors',
                    prefs.accent === accent.value
                      ? 'border-primary/55 bg-primary/10 text-ink'
                      : 'border-line bg-abyss/40 text-muted hover:text-ink',
                  )}
                >
                  <span
                    className="h-3.5 w-3.5 rounded-full"
                    style={{ background: accent.swatch }}
                    aria-hidden
                  />
                  {accent.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Surface</Label>
            <Segmented
              value={prefs.surface}
              onChange={(value) => void patch({ surface: value })}
              options={[
                { value: 'midnight', label: 'Midnight' },
                { value: 'amoled', label: 'AMOLED black' },
              ]}
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border border-line/70 bg-abyss/40 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-ink">Reduced motion</p>
              <p className="text-xs text-muted">Minimizes animation across the interface.</p>
            </div>
            <Switch
              label="Reduced motion"
              checked={prefs.reducedMotion}
              onCheckedChange={(checked) => void patch({ reducedMotion: checked })}
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border border-line/70 bg-abyss/40 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-ink">Interface sound</p>
              <p className="text-xs text-muted">Reserved for completion feedback effects.</p>
            </div>
            <Switch
              label="Interface sound"
              checked={prefs.soundEnabled}
              onCheckedChange={(checked) => void patch({ soundEnabled: checked })}
            />
          </div>
        </Section>

        <Section icon={<ShieldAlert className="h-4.5 w-4.5" aria-hidden />} title="Quest preferences" description="How the daily generator selects your quests.">
          <div>
            <Label>Preferred difficulty</Label>
            <Segmented<Difficulty | 'adaptive'>
              value={prefs.difficulty}
              onChange={(value) => void patch({ difficulty: value })}
              options={[
                { value: 'adaptive', label: 'Adaptive' },
                { value: 'easy', label: 'Easy' },
                { value: 'medium', label: 'Medium' },
                { value: 'hard', label: 'Hard' },
              ]}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Quests per day" htmlFor="set-count" hint={`${prefs.dailyQuestCount}`}>
              <input
                id="set-count"
                type="range"
                min={3}
                max={7}
                value={prefs.dailyQuestCount}
                onChange={(e) => void patch({ dailyQuestCount: Number(e.target.value) })}
                className="mt-3 w-full accent-[var(--color-primary)]"
              />
            </Field>
            <Field label="Daily time budget" htmlFor="set-minutes" hint={`${prefs.dailyMinutes} min`}>
              <input
                id="set-minutes"
                type="range"
                min={15}
                max={120}
                step={5}
                value={prefs.dailyMinutes}
                onChange={(e) => void patch({ dailyMinutes: Number(e.target.value) })}
                className="mt-3 w-full accent-[var(--color-primary)]"
              />
            </Field>
          </div>

          <div>
            <Label>Active development paths</Label>
            <div className="flex flex-wrap gap-2">
              {(['vitality', 'intelligence', 'discipline'] as const).map((path) => {
                const active = prefs.activePaths.includes(path);
                return (
                  <button
                    key={path}
                    aria-pressed={active}
                    onClick={() => {
                      const next = active
                        ? prefs.activePaths.filter((p) => p !== path)
                        : [...prefs.activePaths, path];
                      if (next.length === 0) {
                        toast({
                          title: 'Keep at least one path active',
                          description: 'The system needs a path to generate quests from.',
                          variant: 'error',
                        });
                        return;
                      }
                      void patch({ activePaths: next });
                    }}
                    className={cn(
                      'rounded-xl border px-3.5 py-2 text-sm font-medium capitalize transition-colors',
                      active
                        ? 'border-primary/50 bg-primary/12 text-ink'
                        : 'border-line bg-abyss/40 text-muted hover:text-ink',
                    )}
                  >
                    {path}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label>Training intensity</Label>
            <Segmented
              value={prefs.trainingIntensity}
              onChange={(value) => void patch({ trainingIntensity: value })}
              options={[
                { value: 'light', label: 'Light' },
                { value: 'moderate', label: 'Moderate' },
                { value: 'rigorous', label: 'Rigorous' },
              ]}
            />
          </div>

          <div>
            <Label>Planned rest days</Label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((label, index) => {
                const active = prefs.restDays.includes(index);
                return (
                  <button
                    key={label}
                    aria-pressed={active}
                    onClick={() =>
                      void patch({
                        restDays: active
                          ? prefs.restDays.filter((d) => d !== index)
                          : [...prefs.restDays, index],
                      })
                    }
                    className={cn(
                      'h-10 min-w-12 rounded-xl border px-2 text-xs font-medium transition-colors',
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
            <p className="mt-2 text-xs text-faint">
              Rest days are grace days for streaks — they never break or advance the chain.
            </p>
          </div>
        </Section>

        <Section icon={<Bell className="h-4.5 w-4.5" aria-hidden />} title="Reminders" description="Stored as preferences only — no delivery mechanism is connected in this version.">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-line/70 bg-abyss/40 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-ink">Daily reminder preference</p>
              <p className="text-xs text-muted">Reminder time: {prefs.reminderTime}</p>
            </div>
            <Switch
              label="Daily reminder preference"
              checked={prefs.remindersEnabled}
              onCheckedChange={(checked) => void patch({ remindersEnabled: checked })}
            />
          </div>
          <Field label="Preferred reminder time" htmlFor="set-time">
            <Input
              id="set-time"
              type="time"
              value={prefs.reminderTime}
              onChange={(e) => void patch({ reminderTime: e.target.value })}
              className="max-w-40"
            />
          </Field>
          <div className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning/8 px-3.5 py-3">
            <Bell className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
            <p className="text-xs leading-relaxed text-muted">
              This is a stored preference. ARISE does not send emails, push notifications or any
              external messages in this version.
            </p>
          </div>
        </Section>

        <Section icon={<Monitor className="h-4.5 w-4.5" aria-hidden />} title="Data & account" description="Export your records or manage this account.">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-line/70 bg-abyss/40 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-ink">
                {mode === 'supabase' ? 'Supabase (cloud)' : mode === 'local' ? 'Local browser storage' : 'Supabase unavailable'}
              </p>
              <p className="text-xs text-muted">
                {mode === 'supabase'
                  ? 'Records are stored in PostgreSQL with Row Level Security.'
                  : mode === 'local'
                    ? 'Records live in this browser during explicitly enabled development mode.'
                    : 'Configure valid Supabase credentials to access account data.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" size="sm" onClick={() => void handleExport()}>
              <Download className="h-4 w-4" aria-hidden /> Export my data
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void signOut()}>
              <LogOut className="h-4 w-4" aria-hidden /> Sign out
            </Button>
          </div>

          <div className="rounded-xl border border-danger/30 bg-danger/8 px-4 py-4">
            <p className="text-sm font-semibold text-danger">Danger zone</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Deleting removes your account and every record: quests, XP, lessons, sessions,
              reflections and achievements. This cannot be undone.
            </p>
            <Button variant="danger" size="sm" className="mt-3" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" aria-hidden /> Delete account
            </Button>
          </div>

          {!capabilities.emailDelivery && (
            <p className="text-xs text-faint">
              Configure Supabase (see docs/SETUP.md) to enable email delivery for verification and
              password recovery.
            </p>
          )}
        </Section>
      </div>

      {deleteOpen && (
        <DialogContent
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete your account"
          description="This permanently removes your account and all owned records. There is no undo."
        >
          <div className="space-y-4">
            <Field
              label="Type DELETE to confirm"
              htmlFor="confirm-delete"
              error={confirmText && confirmText !== 'DELETE' ? 'Type DELETE exactly.' : undefined}
            >
              <Input
                id="confirm-delete"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
              />
            </Field>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={confirmText !== 'DELETE'}
                onClick={async () => {
                  try {
                    await deleteAccount();
                    await signOut();
                    toast({ title: 'Account deleted', variant: 'success' });
                    navigate('/', { replace: true });
                  } catch (err) {
                    toast({
                      title: 'Could not delete account',
                      description: err instanceof Error ? err.message : undefined,
                      variant: 'error',
                    });
                  }
                }}
              >
                <Trash2 className="h-4 w-4" aria-hidden /> Delete forever
              </Button>
            </div>
          </div>
        </DialogContent>
      )}
    </div>
  );
}
