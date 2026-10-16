import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Menu, ShieldAlert, X } from 'lucide-react';
import { useAuth } from '@/app/AuthProvider';
import { useData } from '@/app/DataProvider';
import { AriseWordmark } from '@/components/brand/Wordmark';
import { CelebrationOverlay } from '@/components/features/CelebrationOverlay';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import { MOBILE_NAV, NAV_GROUPS } from './navigation';

function NavItems({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  const { bootstrap } = useData();
  const initials = (bootstrap?.profile.displayName ?? 'H')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className={className}>
      {NAV_GROUPS.map((group) => (
        <nav key={group.label} aria-label={group.label} className="mb-5">
          <p className="mb-2 px-3 text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-faint">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/12 text-ink shadow-[inset_0_0_0_1px_var(--color-primary)]/30'
                        : 'text-muted hover:bg-raised/60 hover:text-ink',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        className={cn(
                          'h-[18px] w-[18px] transition-colors',
                          isActive ? 'text-primary-soft' : 'text-faint group-hover:text-muted',
                        )}
                        aria-hidden
                      />
                      {item.label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      ))}
      <div className="mt-auto rounded-2xl border border-line/70 bg-abyss/60 p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-primary/30 bg-primary/12 font-display text-sm font-bold text-primary-soft">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">
              {bootstrap?.profile.displayName ?? 'Hunter'}
            </p>
            <p className="truncate text-xs text-faint">{bootstrap?.profile.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppShell() {
  const { celebration, clearCelebration, mode, status } = useData();
  const { signOut } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-dvh bg-void">
      <CelebrationOverlay result={celebration} onDismiss={clearCelebration} />

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line/70 bg-abyss/50 px-4 py-5 lg:flex">
        <NavLink to="/app" className="mb-7 px-1">
          <AriseWordmark markSize={26} textSize="text-base" />
        </NavLink>
        <div className="flex flex-1 flex-col overflow-y-auto">
          <NavItems />
        </div>
        <div className="mt-4 flex flex-col gap-2 border-t border-line/70 pt-4">
          {mode === 'local' && (
            <Badge variant="warning" className="justify-center">
              <ShieldAlert className="h-3 w-3" aria-hidden /> Local mode
            </Badge>
          )}
          <button
            onClick={() => void signOut()}
            className="rounded-xl px-3 py-2 text-left text-sm font-medium text-muted transition-colors hover:bg-raised/60 hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line/70 bg-void/85 px-4 py-3 backdrop-blur lg:hidden">
        <NavLink to="/app">
          <AriseWordmark markSize={24} textSize="text-sm" />
        </NavLink>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          className="rounded-lg border border-line bg-raised/60 p-2 text-muted transition-colors hover:text-ink"
        >
          {menuOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-x-0 top-16 bottom-0 z-30 overflow-y-auto border-b border-line bg-abyss px-4 py-5 lg:hidden"
          >
            <NavItems onNavigate={() => setMenuOpen(false)} className="flex flex-col" />
            <button
              onClick={() => void signOut()}
              className="w-full rounded-xl border border-line px-3 py-2.5 text-sm font-medium text-muted"
            >
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="lg:pl-64">
        <main
          key={status === 'ready' ? 'ready' : 'loading'}
          className="mx-auto w-full max-w-7xl px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pb-12"
        >
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-abyss/95 px-2 py-1.5 backdrop-blur lg:hidden"
      >
        <ul className="flex items-stretch justify-around">
          {MOBILE_NAV.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[0.625rem] font-medium transition-colors',
                    isActive ? 'text-primary-soft' : 'text-faint',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={cn('h-5 w-5', isActive && 'drop-shadow-[0_0_8px_var(--color-primary)]')} aria-hidden />
                    {item.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
