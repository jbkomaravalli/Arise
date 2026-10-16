import { RANK_COLORS, rankDefinition } from '@/core';
import type { RankTier } from '@/core/types';
import { cn } from '@/lib/cn';

/** Colored rank sigil used across dashboard, profile and analytics. */
export function RankBadge({
  tier,
  size = 'md',
  showName = true,
  className,
}: {
  tier: RankTier;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}) {
  const color = RANK_COLORS[tier];
  const def = rankDefinition(tier);
  const dims =
    size === 'lg'
      ? { box: 'h-16 w-16 text-2xl', gap: 'gap-3', name: 'text-base' }
      : size === 'sm'
        ? { box: 'h-9 w-9 text-sm', gap: 'gap-2', name: 'text-xs' }
        : { box: 'h-12 w-12 text-lg', gap: 'gap-2.5', name: 'text-sm' };

  return (
    <div className={cn('flex items-center', dims.gap, className)}>
      <span
        className={cn(
          'grid place-items-center rounded-xl border font-display font-bold',
          dims.box,
        )}
        style={{
          color,
          borderColor: `${color}55`,
          background: `linear-gradient(150deg, ${color}22, ${color}0a)`,
          boxShadow: `0 0 24px -8px ${color}80`,
        }}
        aria-label={`Rank ${tier}`}
      >
        {tier}
      </span>
      {showName && (
        <span className="flex flex-col">
          <span className={cn('font-display font-semibold text-ink', dims.name)}>{def.name}</span>
          <span className="text-[0.6875rem] uppercase tracking-[0.16em] text-faint">
            Rank {tier}
          </span>
        </span>
      )}
    </div>
  );
}
