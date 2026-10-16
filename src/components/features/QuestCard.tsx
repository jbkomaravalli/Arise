import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { Check, Clock, Eye, Hourglass, SkipForward, Swords } from 'lucide-react';
import type { QuestAssignment, QuestTemplate } from '@/core/types';
import { xpForTemplate } from '@/core/quests';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DialogContent } from '@/components/ui/dialog';
import { Label, Textarea } from '@/components/ui/form';
import { cn } from '@/lib/cn';
import { DIFFICULTY_META, STATUS_META, pathMeta } from '@/lib/quests';

const DIFFICULTY_VARIANT = {
  easy: 'success',
  medium: 'primary',
  hard: 'danger',
} as const;

export function CompleteQuestDialog({
  open,
  onOpenChange,
  template,
  onConfirm,
  busy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: QuestTemplate;
  onConfirm: (input: { evidence?: string; notes?: string }) => void;
  busy?: boolean;
}) {
  const [checked, setChecked] = useState<boolean[]>(() => template.criteria.map(() => false));
  const [evidence, setEvidence] = useState('');
  const [notes, setNotes] = useState('');
  const allChecked = checked.length === 0 || checked.every(Boolean);

  return (
    <DialogContent
      open={open}
      onOpenChange={onOpenChange}
      title="Complete quest"
      description="Confirm every requirement before claiming your reward — the system awards XP exactly once."
    >
      <div className="space-y-4">
        <div>
          <p className="rune-badge mb-1">{pathMeta(template.path).name}</p>
          <p className="font-display text-base font-semibold text-ink">{template.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{template.description}</p>
        </div>

        <fieldset>
          <legend className="mb-2 text-[0.8125rem] font-medium text-ink">
            Acceptance criteria
          </legend>
          <ul className="space-y-2">
            {template.criteria.map((criterion, index) => (
              <li key={criterion}>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line/70 bg-abyss/40 px-3 py-2.5 transition-colors hover:border-primary/40">
                  <input
                    type="checkbox"
                    checked={checked[index] ?? false}
                    onChange={(e) =>
                      setChecked((prev) => prev.map((v, i) => (i === index ? e.target.checked : v)))
                    }
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-primary)]"
                  />
                  <span className="text-sm leading-snug text-muted">{criterion}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        {template.confirmRequired && (
          <div>
            <Label htmlFor="quest-evidence">Evidence (optional)</Label>
            <Textarea
              id="quest-evidence"
              placeholder="What did you actually do? A link, a number, or a sentence."
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              className="min-h-20"
            />
          </div>
        )}

        <div>
          <Label htmlFor="quest-notes" hint="private">
            Notes (optional)
          </Label>
          <Textarea
            id="quest-notes"
            placeholder="Anything you want future-you to remember about this session."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-16"
          />
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
          <span className="text-sm text-muted">Reward</span>
          <span className="font-mono text-lg font-bold text-primary-soft">
            +{xpForTemplate(template)} XP
          </span>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!allChecked}
            loading={busy}
            onClick={() =>
              onConfirm({
                evidence: evidence.trim() || undefined,
                notes: notes.trim() || undefined,
              })
            }
          >
            <Check className="h-4 w-4" aria-hidden />
            Complete quest
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

export function QuestCard({
  assignment,
  template,
  onAccept,
  onComplete,
  onSkip,
  busy,
  compact = false,
}: {
  assignment: QuestAssignment;
  template: QuestTemplate | undefined;
  onAccept?: (id: string) => void;
  onComplete?: (id: string, input: { evidence?: string; notes?: string }) => void;
  onSkip?: (id: string) => void;
  busy?: boolean;
  compact?: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const reducedMotion = useReducedMotion();

  if (!template) return null;
  const meta = pathMeta(template.path);
  const status = STATUS_META[assignment.status];
  const xp = xpForTemplate(template);
  const actionable =
    assignment.status === 'available' || assignment.status === 'in_progress';

  return (
    <>
      <motion.article
        layout={!reducedMotion}
        className={cn(
          'group relative overflow-hidden rounded-2xl border border-line bg-surface/80 transition-colors',
          assignment.status === 'completed' && 'border-success/30',
          actionable && 'hover:border-primary/40',
        )}
      >
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-[3px] transition-opacity"
          style={{ background: meta.color, opacity: actionable ? 0.9 : 0.35 }}
        />
        <div className="p-4 pl-5 sm:p-5 sm:pl-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-transparent" style={{ color: meta.color }}>
                  {meta.name}
                </Badge>
                <Badge variant={DIFFICULTY_VARIANT[template.difficulty]}>
                  {DIFFICULTY_META[template.difficulty].label}
                </Badge>
                {template.cadence === 'weekly' && <Badge variant="warning">Weekly challenge</Badge>}
                <span className={cn('text-[0.6875rem] font-semibold uppercase tracking-[0.14em]', status.tone)}>
                  {status.label}
                </span>
              </div>
              <h3 className="font-display text-base font-semibold text-ink">{template.title}</h3>
              {!compact && (
                <p className="mt-1 text-sm leading-relaxed text-muted">{template.description}</p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <p className="font-mono text-lg font-bold text-gradient-accent">+{xp}</p>
              <p className="text-[0.625rem] uppercase tracking-[0.16em] text-faint">XP</p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-faint">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" aria-hidden /> {template.durationMinutes} min
            </span>
            {!compact && (
              <span className="inline-flex items-center gap-1.5">
                <Swords className="h-3.5 w-3.5" aria-hidden /> {template.criteria.length} criteria
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link
              to={`/app/quests/${assignment.id}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-raised/50 px-3 text-xs font-medium text-muted transition-colors hover:border-primary/40 hover:text-ink"
            >
              <Eye className="h-3.5 w-3.5" aria-hidden /> Details
            </Link>

            {assignment.status === 'available' && onAccept && (
              <Button size="sm" variant="secondary" loading={busy} onClick={() => onAccept(assignment.id)}>
                <Hourglass className="h-3.5 w-3.5" aria-hidden /> Accept
              </Button>
            )}

            {actionable && onComplete && (
              <Button size="sm" loading={busy} onClick={() => setDialogOpen(true)}>
                <Check className="h-3.5 w-3.5" aria-hidden /> Complete
              </Button>
            )}

            {assignment.status === 'completed' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                <Check className="h-4 w-4" aria-hidden />
                {assignment.xpAwarded ? `+${assignment.xpAwarded} XP earned` : 'Completed'}
              </span>
            )}

            {assignment.status !== 'completed' && assignment.status !== 'expired' && onSkip && (
              <button
                onClick={() => onSkip(assignment.id)}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-faint transition-colors hover:text-muted"
              >
                <SkipForward className="h-3.5 w-3.5" aria-hidden /> Skip
              </button>
            )}
          </div>
        </div>
      </motion.article>

      {onComplete && (
        <CompleteQuestDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          template={template}
          busy={busy}
          onConfirm={(input) => {
            onComplete(assignment.id, input);
            setDialogOpen(false);
          }}
        />
      )}
    </>
  );
}
