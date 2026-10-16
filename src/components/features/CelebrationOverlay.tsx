import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Award, ChevronUp, Flame, Sparkles } from 'lucide-react';
import type { MutationResult } from '@/core/progression';
import { RANK_COLORS } from '@/core/config';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/**
 * Completion celebration: XP, level and rank changes plus newly earned
 * achievements, presented as a "system notification". Respects reduced motion.
 */
export function CelebrationOverlay({
  result,
  onDismiss,
}: {
  result: MutationResult | null;
  onDismiss: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const open = Boolean(result);

  const levelUp = result && result.levelAfter > result.levelBefore;
  const rankUp = result && result.rankAfter !== result.rankBefore;

  return (
    <AnimatePresence>
      {open && result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[70] grid place-items-center bg-void/85 p-4 backdrop-blur-sm"
          role="dialog"
          aria-live="polite"
          aria-label="Quest completion"
          onClick={onDismiss}
        >
          <motion.div
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 20 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="energy-frame arcane-bg w-full max-w-md rounded-3xl border border-primary/30 bg-surface/95 p-7 text-center shadow-pop"
            onClick={(e) => e.stopPropagation()}
          >
            {!reducedMotion && (
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.05, type: 'spring', stiffness: 220, damping: 16 }}
                className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl border border-primary/40 bg-primary/15"
              >
                <Sparkles className="h-8 w-8 text-primary-soft" aria-hidden />
              </motion.div>
            )}

            <p className="rune-badge mb-1">SYSTEM NOTIFICATION</p>
            <h2 className="font-display text-2xl font-bold text-ink">
              {rankUp ? 'Rank Advancement' : levelUp ? 'Level Up' : 'Quest Complete'}
            </h2>

            {result.xpGained > 0 && (
              <p className="mt-3 font-mono text-4xl font-bold text-gradient-accent">
                +{result.xpGained} XP
              </p>
            )}

            {levelUp && (
              <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5">
                <ChevronUp className="h-4 w-4 text-primary-soft" aria-hidden />
                <span className="text-sm font-semibold text-ink">
                  Level {result.levelBefore} → Level {result.levelAfter}
                </span>
              </div>
            )}

            {rankUp && (
              <div className="mt-3 flex items-center justify-center gap-3 rounded-xl border border-line bg-abyss/60 px-4 py-2.5">
                <span
                  className="font-display text-lg font-bold"
                  style={{ color: RANK_COLORS[result.rankBefore] }}
                >
                  {result.rankBefore}
                </span>
                <span className="text-faint">→</span>
                <span
                  className="font-display text-lg font-bold"
                  style={{ color: RANK_COLORS[result.rankAfter] }}
                >
                  {result.rankAfter}
                </span>
                <Award className="h-4 w-4 text-muted" aria-hidden />
              </div>
            )}

            {result.newAchievements.length > 0 && (
              <div className="mt-4 space-y-2">
                {result.newAchievements.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-2.5 text-left"
                  >
                    <Award className="h-4 w-4 shrink-0 text-warning" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{a.name}</p>
                      <p className="truncate text-xs text-muted">{a.description}</p>
                    </div>
                    <Badge variant="warning" className="ml-auto">
                      +{a.xpReward}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {result.events.length > 0 && (
              <ul className="mt-4 space-y-1 text-left">
                {result.events.slice(0, 4).map((e) => (
                  <li key={e.id} className="flex items-start gap-2 text-xs text-muted">
                    {e.type === 'streak_milestone' ? (
                      <Flame className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
                    ) : (
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" aria-hidden />
                    )}
                    <span>{e.title}</span>
                  </li>
                ))}
              </ul>
            )}

            <Button className="mt-6 w-full" onClick={onDismiss}>
              Continue
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
