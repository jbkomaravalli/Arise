import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Hourglass,
  ListChecks,
  SkipForward,
  Swords,
} from 'lucide-react';
import { useData } from '@/app/DataProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/layout';
import { xpForTemplate } from '@/core/quests';
import { DIFFICULTY_META, STATUS_META, pathMeta, templateFor } from '@/lib/quests';
import { formatDayKey } from '@/lib/time';

export function QuestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { bootstrap, completeQuest, acceptQuest, skipQuest } = useData();
  const [busy, setBusy] = useState(false);

  if (!bootstrap) return null;
  const assignment = bootstrap.assignments.find((a) => a.id === id);
  const template = assignment ? templateFor(assignment.templateId) : undefined;

  if (!assignment || !template) {
    return (
      <EmptyState
        icon={<Swords className="h-8 w-8" aria-hidden />}
        title="Quest not found"
        description="This quest assignment does not exist on your account, or it was replaced by a new daily set."
        action={
          <Link to="/app/quests">
            <Button variant="secondary">Back to quests</Button>
          </Link>
        }
      />
    );
  }

  const meta = pathMeta(template.path);
  const status = STATUS_META[assignment.status];
  const actionable = assignment.status === 'available' || assignment.status === 'in_progress';

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/app/quests"
        className="mb-5 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to quests
      </Link>

      <div className="energy-frame overflow-hidden rounded-2xl border border-line bg-surface/75">
        <span
          aria-hidden
          className="block h-[3px]"
          style={{ background: `linear-gradient(90deg, ${meta.color}, transparent)` }}
        />
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-transparent" style={{ color: meta.color }}>
              {meta.name}
            </Badge>
            <Badge
              variant={
                template.difficulty === 'easy'
                  ? 'success'
                  : template.difficulty === 'medium'
                    ? 'primary'
                    : 'danger'
              }
            >
              {DIFFICULTY_META[template.difficulty].label}
            </Badge>
            {template.cadence === 'weekly' && <Badge variant="warning">Weekly challenge</Badge>}
            <span className={`text-[0.6875rem] font-semibold uppercase tracking-[0.14em] ${status.tone}`}>
              {status.label}
            </span>
          </div>

          <h1 className="mt-3 font-display text-2xl font-bold text-ink sm:text-3xl">
            {template.title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">{template.description}</p>

          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted">
            <span className="inline-flex items-center gap-2">
              <Clock className="h-4 w-4 text-faint" aria-hidden /> {template.durationMinutes} minutes
            </span>
            <span className="inline-flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-faint" aria-hidden />{' '}
              {template.criteria.length} acceptance criteria
            </span>
            <span className="inline-flex items-center gap-2 font-mono font-bold text-primary-soft">
              +{xpForTemplate(template)} XP
            </span>
            <span className="text-xs text-faint">Assigned {formatDayKey(assignment.assignedDate)}</span>
          </div>

          {assignment.status === 'completed' && (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3.5">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-ink">Completed</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">
                  Reward of {assignment.xpAwarded ?? xpForTemplate(template)} XP was issued once and
                  recorded in your progression history.
                  {assignment.evidence && (
                    <>
                      {' '}
                      Evidence: <span className="text-ink">{assignment.evidence}</span>
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

          {assignment.status === 'expired' && (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-line bg-abyss/50 px-4 py-3.5">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-faint" aria-hidden />
              <p className="text-sm leading-relaxed text-muted">
                This quest expired when the day ended. Nothing was lost — no XP is deducted, and a
                fresh set is waiting for today.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {template.instructions.map((step, index) => (
                <li key={step} className="flex gap-3 text-sm leading-relaxed text-muted">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-line bg-abyss/60 font-mono text-xs text-primary-soft">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acceptance criteria</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {template.criteria.map((criterion) => (
                <li key={criterion} className="flex gap-3 text-sm leading-relaxed text-muted">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                  <span>{criterion}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {assignment.notes && (
        <Card className="mt-5">
          <CardHeader>
            <CardTitle>Your notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted">{assignment.notes}</p>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {assignment.status === 'available' && (
          <Button variant="secondary" onClick={() => void acceptQuest(assignment.id)}>
            <Hourglass className="h-4 w-4" aria-hidden /> Accept quest
          </Button>
        )}
        {actionable && (
          <Button
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await completeQuest({ assignmentId: assignment.id });
              } finally {
                setBusy(false);
              }
            }}
          >
            <Check className="h-4 w-4" aria-hidden /> Mark complete
          </Button>
        )}
        {actionable && (
          <Button variant="ghost" onClick={() => void skipQuest(assignment.id)}>
            <SkipForward className="h-4 w-4" aria-hidden /> Skip
          </Button>
        )}
      </div>
    </div>
  );
}
