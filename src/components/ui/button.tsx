import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium tracking-wide transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-soft disabled:pointer-events-none disabled:opacity-50 active:translate-y-px',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-white shadow-[0_10px_30px_-10px_var(--color-primary)] hover:bg-primary-soft hover:shadow-[0_14px_36px_-10px_var(--color-primary)]',
        secondary:
          'border border-line bg-raised/60 text-ink hover:border-primary/50 hover:bg-raised',
        ghost: 'text-muted hover:bg-raised/70 hover:text-ink',
        danger: 'bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25',
        success:
          'bg-success/15 text-success border border-success/30 hover:bg-success/25',
        link: 'text-primary-soft underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-3.5 text-[0.8125rem]',
        md: 'h-11 px-5 text-sm',
        lg: 'h-13 px-7 text-[0.95rem]',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';

export { buttonVariants };
