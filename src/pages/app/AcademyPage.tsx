import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, GraduationCap, Lock, TerminalSquare } from 'lucide-react';
import { useData } from '@/app/DataProvider';
import { LEARNING_PATHS, lessonsForPath } from '@/content/lessons';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/layout';
import { ProgressBar } from '@/components/ui/progress';
import { cn } from '@/lib/cn';

export function AcademyPage() {
  const { bootstrap } = useData();
  const [activePath, setActivePath] = useState(LEARNING_PATHS[0].id);

  const completedLessons = useMemo(
    () => new Set((bootstrap?.lessons ?? []).filter((l) => l.state === 'completed').map((l) => l.lessonId)),
    [bootstrap],
  );

  if (!bootstrap) return null;

  const path = LEARNING_PATHS.find((p) => p.id === activePath) ?? LEARNING_PATHS[0];
  const lessons = lessonsForPath(path.id);
  const completedInPath = lessons.filter((l) => completedLessons.has(l.id)).length;
  const totalXp = lessons.reduce((sum, l) => sum + l.xpReward, 0);

  return (
    <div>
      <PageHeader
        eyebrow="INTELLIGENCE PATH"
        title="Cybersecurity Academy"
        description="Linux, networking, scripting and defensive security — each lesson pairs explanations with a practical exercise and a knowledge check. Labs target only systems you own or are authorized to test."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {LEARNING_PATHS.slice(0, 3).map((p) => {
          const pathLessons = lessonsForPath(p.id);
          const done = pathLessons.filter((l) => completedLessons.has(l.id)).length;
          return (
            <button
              key={p.id}
              onClick={() => setActivePath(p.id)}
              className={cn(
                'rounded-2xl border p-4 text-left transition-all',
                p.id === activePath
                  ? 'border-primary/50 bg-primary/8'
                  : 'border-line bg-surface/60 hover:border-primary/30',
              )}
            >
              <p className="rune-badge mb-1">PATH {p.order}</p>
              <p className="font-display text-sm font-semibold text-ink">{p.title}</p>
              <div className="mt-2.5 flex items-center gap-3">
                <ProgressBar
                  value={done}
                  max={Math.max(1, pathLessons.length)}
                  className="h-1.5 flex-1"
                  label={`${p.title} progress`}
                />
                <span className="font-mono text-xs text-faint">
                  {done}/{pathLessons.length}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[16rem_1fr]">
        {/* Path rail */}
        <nav aria-label="Learning paths" className="lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Learning paths</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {LEARNING_PATHS.map((p) => {
                const pathLessons = lessonsForPath(p.id);
                const done = pathLessons.filter((l) => completedLessons.has(l.id)).length;
                return (
                  <button
                    key={p.id}
                    onClick={() => setActivePath(p.id)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                      p.id === activePath
                        ? 'bg-primary/12 text-ink'
                        : 'text-muted hover:bg-raised/60 hover:text-ink',
                    )}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className="truncate">{p.title}</span>
                    </span>
                    <span className="font-mono text-[0.6875rem] text-faint">
                      {done}/{pathLessons.length}
                    </span>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </nav>

        {/* Lessons */}
        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="rune-badge mb-1">PATH {path.order}</p>
              <h2 className="font-display text-xl font-bold text-ink">{path.title}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{path.summary}</p>
              <p className="mt-2 text-xs text-highlight">{path.motivation}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm font-bold text-primary-soft">{totalXp} XP total</p>
              <p className="text-xs text-faint">
                {completedInPath} of {lessons.length} complete
              </p>
            </div>
          </div>

          <ol className="space-y-3">
            {lessons.map((lesson, index) => {
              const done = completedLessons.has(lesson.id);
              const progress = bootstrap.lessons.find((l) => l.lessonId === lesson.id);
              const previousDone = index === 0 || completedLessons.has(lessons[index - 1].id);
              const locked = !previousDone && !done;
              const content = (
                <>
                  <div className="flex items-start gap-4">
                    <span
                      className={cn(
                        'grid h-10 w-10 shrink-0 place-items-center rounded-xl border font-mono text-xs font-bold',
                        done
                          ? 'border-success/40 bg-success/12 text-success'
                          : locked
                            ? 'border-line bg-abyss/40 text-faint'
                            : 'border-primary/40 bg-primary/12 text-primary-soft',
                      )}
                      aria-hidden
                    >
                      {done ? <CheckCircle2 className="h-5 w-5" /> : locked ? <Lock className="h-4 w-4" /> : index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-base font-semibold text-ink">{lesson.title}</h3>
                        {done && <Badge variant="success">Complete</Badge>}
                        {progress?.quizScore != null && progress.quizScore > 0 && (
                          <Badge variant="outline">Quiz {progress.quizScore}%</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-muted">{lesson.summary}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-faint">
                        <span>{lesson.minutes} min</span>
                        <span>{lesson.quiz.length} quiz questions</span>
                        <span className="font-mono text-primary-soft">+{lesson.xpReward} XP</span>
                      </div>
                    </div>
                    {!locked && (
                      <ArrowRight className="mt-3 h-4 w-4 shrink-0 text-faint" aria-hidden />
                    )}
                  </div>
                </>
              );

              return (
                <li key={lesson.id}>
                  {locked ? (
                    <div className="rounded-2xl border border-line/60 bg-abyss/30 p-4 opacity-70">
                      {content}
                    </div>
                  ) : (
                    <Link
                      to={`/app/academy/${lesson.id}`}
                      className="block rounded-2xl border border-line bg-surface/70 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40"
                    >
                      {content}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>

          <div className="mt-6 flex items-start gap-3 rounded-xl border border-line bg-abyss/50 px-4 py-3.5">
            <TerminalSquare className="mt-0.5 h-4 w-4 shrink-0 text-highlight" aria-hidden />
            <p className="text-xs leading-relaxed text-muted">
              Practice only on systems you own or are explicitly authorized to test — your own
              machine, a local VM, or platforms designed for practice (OverTheWire, PicoCTF, DVWA,
              Juice Shop). Unauthorized testing of other systems is never part of this curriculum.
            </p>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-xl border border-line/70 bg-abyss/40 px-4 py-3">
            <GraduationCap className="h-4 w-4 shrink-0 text-primary-soft" aria-hidden />
            <p className="text-xs text-muted">
              Completed lessons unlock Intelligence skills in your skill tree automatically.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
