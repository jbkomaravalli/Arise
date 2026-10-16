import { useMemo, useState } from 'react';
import { Swords, CalendarRange, CheckCircle2, History as HistoryIcon } from 'lucide-react';
import { useData } from '@/app/DataProvider';
import { QuestCard } from '@/components/features/QuestCard';
import { PageHeader, EmptyState, Segmented } from '@/components/ui/layout';
import { todaysQuests, templateFor, weeklyQuests } from '@/lib/quests';

type Tab = 'today' | 'weekly' | 'past';

export function QuestsPage() {
  const { bootstrap, completeQuest, acceptQuest, skipQuest } = useData();
  const [tab, setTab] = useState<Tab>('today');
  const [busyId, setBusyId] = useState<string | null>(null);

  const views = useMemo(() => {
    if (!bootstrap) return { today: [], weekly: [], past: [] };
    const today = todaysQuests(bootstrap);
    const weekly = weeklyQuests(bootstrap);
    const past = bootstrap.assignments
      .filter((a) => a.status === 'expired' || a.status === 'skipped')
      .sort((a, b) => b.assignedDate.localeCompare(a.assignedDate))
      .slice(0, 24)
      .map((a) => ({ assignment: a, template: templateFor(a.templateId) }));
    return { today, weekly, past };
  }, [bootstrap]);

  if (!bootstrap) return null;

  const handleComplete = async (
    assignmentId: string,
    input: { evidence?: string; notes?: string },
  ) => {
    setBusyId(assignmentId);
    try {
      await completeQuest({ assignmentId, ...input });
    } finally {
      setBusyId(null);
    }
  };

  const completedToday = views.today.filter((v) => v.assignment.status === 'completed').length;

  return (
    <div>
      <PageHeader
        eyebrow="DAILY OPERATIONS"
        title="Quests"
        description="Your daily set is generated deterministically for your time zone. Complete quests with evidence — XP is awarded exactly once."
        actions={
          <Segmented<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { value: 'today', label: 'Today' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'past', label: 'Past' },
            ]}
          />
        }
      />

      {tab === 'today' && (
        <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-muted">
          <span className="inline-flex items-center gap-2">
            <Swords className="h-4 w-4 text-primary-soft" aria-hidden />
            {views.today.length} quests assigned
          </span>
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
            {completedToday} completed
          </span>
        </div>
      )}

      {tab === 'today' &&
        (views.today.length === 0 ? (
          <EmptyState
            icon={<Swords className="h-8 w-8" aria-hidden />}
            title="No quests for today"
            description="Reload to re-sync your daily assignment, or check in Settings that your development paths are active."
          />
        ) : (
          <div className="space-y-3">
            {views.today.map(({ assignment, template }) => (
              <QuestCard
                key={assignment.id}
                assignment={assignment}
                template={template}
                busy={busyId === assignment.id}
                onAccept={(id) => void acceptQuest(id)}
                onComplete={(id, input) => void handleComplete(id, input)}
                onSkip={(id) => void skipQuest(id)}
              />
            ))}
          </div>
        ))}

      {tab === 'weekly' &&
        (views.weekly.length === 0 ? (
          <EmptyState
            icon={<CalendarRange className="h-8 w-8" aria-hidden />}
            title="No active weekly challenge"
            description="A weekly challenge is assigned automatically each week when at least one development path is active."
          />
        ) : (
          <div className="space-y-3">
            {views.weekly.map(({ assignment, template }) => (
              <QuestCard
                key={assignment.id}
                assignment={assignment}
                template={template}
                busy={busyId === assignment.id}
                onAccept={(id) => void acceptQuest(id)}
                onComplete={(id, input) => void handleComplete(id, input)}
              />
            ))}
          </div>
        ))}

      {tab === 'past' && (
        <div className="space-y-3">
          {views.past.length === 0 ? (
            <EmptyState
              icon={<HistoryIcon className="h-8 w-8" aria-hidden />}
              title="Nothing archived yet"
              description="Expired or skipped quests appear here. They never remove XP or progress."
            />
          ) : (
            views.past.map(({ assignment, template }) => (
              <QuestCard key={assignment.id} assignment={assignment} template={template} compact />
            ))
          )}
        </div>
      )}
    </div>
  );
}
