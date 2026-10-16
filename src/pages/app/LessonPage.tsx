import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  GraduationCap,
  ListChecks,
  Target,
  XCircle,
} from 'lucide-react';
import { useData } from '@/app/DataProvider';
import { LESSON_MAP, LEARNING_PATHS, lessonsForPath } from '@/content/lessons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/layout';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-xl border border-line bg-void/80 p-4 font-mono text-[0.8125rem] leading-relaxed text-highlight/90">
      <code>{code}</code>
    </pre>
  );
}

export function LessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { bootstrap, completeLesson } = useData();
  const { toast } = useToast();

  const lesson = lessonId ? LESSON_MAP[lessonId] : undefined;
  const progress = bootstrap?.lessons.find((l) => l.lessonId === lessonId);

  const [answers, setAnswers] = useState<number[]>(() => lesson?.quiz.map(() => -1) ?? []);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const score = useMemo(() => {
    if (!lesson) return 0;
    const correct = lesson.quiz.reduce(
      (sum, q, i) => sum + (answers[i] === q.answerIndex ? 1 : 0),
      0,
    );
    return Math.round((correct / lesson.quiz.length) * 100);
  }, [lesson, answers]);

  if (!bootstrap || !lesson) {
    return (
      <EmptyState
        icon={<GraduationCap className="h-8 w-8" aria-hidden />}
        title="Lesson not found"
        description="This lesson is not part of the current curriculum."
        action={
          <Link to="/app/academy">
            <Button variant="secondary">Back to Academy</Button>
          </Link>
        }
      />
    );
  }

  const path = LEARNING_PATHS.find((p) => p.id === lesson.pathId);
  const siblings = lessonsForPath(lesson.pathId);
  const index = siblings.findIndex((l) => l.id === lesson.id);
  const next = siblings[index + 1];
  const allAnswered = answers.every((a) => a >= 0);
  const passed = score >= 70;
  const alreadyCompleted = progress?.state === 'completed';

  const handleSubmit = async () => {
    setSubmitted(true);
    if (!passed) return;
    setBusy(true);
    try {
      const result = await completeLesson({ lessonId: lesson.id, quizScore: score });
      toast({
        title: result.duplicate ? 'Score updated' : 'Lesson complete',
        description: result.duplicate
          ? 'Your quiz score was refreshed — XP is only awarded once per lesson.'
          : `+${lesson.xpReward} XP · Quiz score ${score}%`,
        variant: 'xp',
      });
    } catch (err) {
      toast({
        title: 'Could not record the lesson',
        description: err instanceof Error ? err.message : 'Try again.',
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const retry = () => {
    setSubmitted(false);
    setAnswers(lesson.quiz.map(() => -1));
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/app/academy"
        className="mb-5 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to Academy
      </Link>

      <header className="energy-frame mb-6 rounded-2xl border border-line bg-surface/75 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="primary">{path?.title}</Badge>
          <Badge variant="outline">Lesson {index + 1}</Badge>
          {alreadyCompleted && <Badge variant="success">Completed</Badge>}
          <span className="text-xs text-faint">{lesson.minutes} min</span>
        </div>
        <h1 className="mt-3 font-display text-2xl font-bold text-ink sm:text-3xl">{lesson.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">{lesson.summary}</p>

        <div className="mt-5 rounded-xl border border-line/70 bg-abyss/50 p-4">
          <p className="rune-badge mb-2">LEARNING OBJECTIVES</p>
          <ul className="space-y-1.5">
            {lesson.objectives.map((objective) => (
              <li key={objective} className="flex gap-2.5 text-sm leading-relaxed text-muted">
                <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-soft" aria-hidden />
                <span>{objective}</span>
              </li>
            ))}
          </ul>
        </div>
      </header>

      <div className="space-y-5">
        {lesson.sections.map((section) => (
          <Card key={section.heading}>
            <CardHeader>
              <CardTitle>{section.heading}</CardTitle>
            </CardHeader>
            <CardContent>
              {section.body.map((paragraph) => (
                <p key={paragraph} className="mb-3 text-sm leading-relaxed text-muted">
                  {paragraph}
                </p>
              ))}
              {section.code && <CodeBlock code={section.code} />}
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader>
            <CardTitle>Practical exercise</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted">{lesson.exercise}</p>
          </CardContent>
        </Card>

        {/* Quiz */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Knowledge check</CardTitle>
              <p className="mt-1 text-xs text-muted">
                Score 70% or better to complete the lesson and claim your XP.
              </p>
            </div>
            {submitted && (
              <Badge variant={passed ? 'success' : 'danger'}>{score}%</Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-5">
            {lesson.quiz.map((question, qIndex) => (
              <fieldset key={question.question}>
                <legend className="mb-2 text-sm font-semibold text-ink">
                  {qIndex + 1}. {question.question}
                </legend>
                <div className="space-y-2">
                  {question.options.map((option, oIndex) => {
                    const selected = answers[qIndex] === oIndex;
                    const isCorrect = oIndex === question.answerIndex;
                    const showState = submitted;
                    return (
                      <label
                        key={option}
                        className={cn(
                          'flex cursor-pointer items-start gap-3 rounded-lg border px-3.5 py-2.5 transition-colors',
                          showState && isCorrect
                            ? 'border-success/50 bg-success/10'
                            : showState && selected && !isCorrect
                              ? 'border-danger/50 bg-danger/10'
                              : selected
                                ? 'border-primary/50 bg-primary/10'
                                : 'border-line/70 bg-abyss/30 hover:border-primary/30',
                        )}
                      >
                        <input
                          type="radio"
                          name={`q-${qIndex}`}
                          checked={selected}
                          disabled={showState}
                          onChange={() =>
                            setAnswers((prev) => prev.map((a, i) => (i === qIndex ? oIndex : a)))
                          }
                          className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]"
                        />
                        <span className="text-sm leading-snug text-muted">{option}</span>
                        {showState && isCorrect && (
                          <Check className="ml-auto mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                        )}
                        {showState && selected && !isCorrect && (
                          <XCircle className="ml-auto mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
                        )}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted">
                {submitted
                  ? passed
                    ? 'Pass — this lesson is now complete.'
                    : 'Below the pass mark. Review the sections and retake.'
                  : `${answers.filter((a) => a >= 0).length} of ${lesson.quiz.length} answered`}
              </p>
              <div className="flex gap-3">
                {submitted && !passed && (
                  <Button variant="secondary" onClick={retry}>
                    Retake quiz
                  </Button>
                )}
                {!submitted && (
                  <Button disabled={!allAnswered} onClick={() => void handleSubmit()}>
                    Submit answers
                  </Button>
                )}
                {submitted && passed && !alreadyCompleted && (
                  <Button loading={busy} onClick={() => void handleSubmit()}>
                    <Check className="h-4 w-4" aria-hidden /> Claim {lesson.xpReward} XP
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Key takeaways</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {lesson.takeaways.map((takeaway) => (
                <li key={takeaway} className="flex gap-2.5 text-sm leading-relaxed text-muted">
                  <ListChecks className="mt-0.5 h-3.5 w-3.5 shrink-0 text-highlight" aria-hidden />
                  <span>{takeaway}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {next && (
          <Link
            to={`/app/academy/${next.id}`}
            className="flex items-center justify-between rounded-2xl border border-line bg-surface/70 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40"
          >
            <div>
              <p className="rune-badge mb-1">RECOMMENDED NEXT</p>
              <p className="font-display text-base font-semibold text-ink">{next.title}</p>
              <p className="mt-0.5 text-xs text-muted">
                {next.minutes} min · +{next.xpReward} XP
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-primary-soft" aria-hidden />
          </Link>
        )}
      </div>
    </div>
  );
}
