import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { AriseMark } from '@/components/brand/Wordmark';
import { dataMode } from '@/data';
import { cn } from '@/lib/cn';

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="arcane-bg grid min-h-dvh place-items-center bg-void px-4 py-10">
      <div className="grid-veil absolute inset-0" aria-hidden />
      <div className="relative w-full max-w-md">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to ARISE
        </Link>

        <div className="energy-frame rounded-3xl border border-line bg-surface/85 p-7 shadow-pop sm:p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-primary/30 bg-primary/10">
              <AriseMark size={34} />
            </span>
            <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>
          </div>

          {dataMode === 'unconfigured' && (
            <div role="alert" className="mb-5 rounded-xl border border-danger/35 bg-danger/10 px-3.5 py-3">
              <p className="text-sm leading-relaxed text-danger">
                Supabase is not configured for this deployment. Set VITE_SUPABASE_URL and
                VITE_SUPABASE_ANON_KEY in the hosting environment, then rebuild and redeploy.
              </p>
            </div>
          )}

          {children}
        </div>

        {footer && <div className="mt-5 text-center text-sm text-muted">{footer}</div>}

        <p className={cn('mt-6 text-center text-[0.6875rem] tracking-wide text-faint')}>
          {dataMode === 'local'
            ? 'Local mode — accounts and records are stored in this browser until Supabase is configured.'
            : dataMode === 'supabase'
              ? 'Secured by Supabase Auth · Row Level Security enforced'
              : 'Authentication unavailable until Supabase is configured'}
        </p>
      </div>
    </div>
  );
}
