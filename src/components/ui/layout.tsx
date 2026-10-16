import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  size = 'md',
}: {
  options: { value: T; label: string; icon?: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div
      role="radiogroup"
      className={cn('inline-flex w-full flex-wrap gap-1 rounded-xl border border-line bg-abyss/60 p-1', className)}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg font-medium transition-all',
              size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-[0.8125rem]',
              active
                ? 'bg-primary/15 text-ink shadow-[inset_0_0_0_1px_var(--color-primary)]/40'
                : 'text-muted hover:bg-raised/60 hover:text-ink',
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-line/80 bg-abyss/40 px-6 py-12 text-center',
        className,
      )}
    >
      {icon && <div className="mb-3 text-primary/70">{icon}</div>}
      <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-line/70 bg-abyss/40 px-4 py-3', className)}>
      <p className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-faint">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="rune-badge mb-1.5">{eyebrow}</p>}
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
