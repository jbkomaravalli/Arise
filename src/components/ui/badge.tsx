import type { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.12em]',
  {
    variants: {
      variant: {
        default: 'border-line bg-raised/60 text-muted',
        primary: 'border-primary/35 bg-primary/12 text-primary-soft',
        highlight: 'border-highlight/35 bg-highlight/12 text-highlight',
        success: 'border-success/35 bg-success/12 text-success',
        warning: 'border-warning/35 bg-warning/12 text-warning',
        danger: 'border-danger/35 bg-danger/12 text-danger',
        outline: 'border-line text-muted',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
