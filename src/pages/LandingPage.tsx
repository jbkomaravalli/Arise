import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Brain,
  ChevronDown,
  Dumbbell,
  Fingerprint,
  Flame,
  Gauge,
  Lock,
  ScrollText,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Trophy,
} from 'lucide-react';
import { useAuth } from '@/app/AuthProvider';
import { AriseLockup, AriseMark, AriseWordmark } from '@/components/brand/Wordmark';
import { RankBadge } from '@/components/RankBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress';
import { PATHS, RANK_LADDER, XP_REWARDS } from '@/core/config';
import { cn } from '@/lib/cn';

const fade = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
};

const PATH_ICONS = { vitality: Dumbbell, intelligence: TerminalSquare, discipline: Brain } as const;

const FAQS = [
  {
    q: 'Is ARISE just another habit tracker?',
    a: 'No. Habit trackers record intentions. ARISE is built around a progression engine: quests carry acceptance criteria, XP is awarded once per verified completion, and ranks require evidence across all three development paths — not raw volume.',
  },
  {
    q: 'Do I need a gym, a lab, or special equipment?',
    a: 'No. Vitality quests use calisthenics, mobility and walking that fit a small room. The Academy uses your own machine or free, authorized training platforms. Everything is designed for a beginner starting from zero.',
  },
  {
    q: 'How are quests generated?',
    a: 'Deterministically. Each day, your time zone, level, preferences and history select a stable set from a curated quest library. Same inputs, same quests — no AI dependency, no randomness you cannot explain.',
  },
  {
    q: 'Who can see my data?',
    a: 'Only your account. Database access is enforced by Row Level Security, journal entries are private by design, and there are no public profiles or leaderboards in this version.',
  },
  {
    q: 'What happens if I miss a day?',
    a: 'Nothing is erased. Your XP, quests and history stay intact. The streak rule treats a configured rest day as a grace day, and a broken streak never takes anything back — it just resumes when you return.',
  },
  {
    q: 'Does it cost anything?',
    a: 'The whole system runs on your own Supabase project or locally in your browser. No subscription, no paywalled ranks, no ads.',
  },
];

function GatewayArt() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-md" aria-hidden>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0 rounded-full border border-primary/25"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-8 rounded-full border border-highlight/20"
      />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 90, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-16 rounded-full border border-dashed border-primary/15"
      />
      <div className="absolute inset-0 grid place-items-center">
        <motion.div
          animate={{ y: [-6, 6, -6] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="grid h-28 w-28 place-items-center rounded-3xl border border-primary/40 bg-surface/70 shadow-glow"
        >
          <AriseMark size={64} />
        </motion.div>
      </div>
      {[
        { top: '8%', left: '18%', delay: 0 },
        { top: '24%', left: '82%', delay: 1.2 },
        { top: '72%', left: '12%', delay: 0.6 },
        { top: '84%', left: '74%', delay: 1.8 },
        { top: '46%', left: '94%', delay: 2.4 },
        { top: '58%', left: '4%', delay: 3 },
      ].map((pos, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0.15, scale: 0.8 }}
          animate={{ opacity: [0.15, 0.7, 0.15], scale: [0.8, 1.15, 0.8] }}
          transition={{ duration: 4, repeat: Infinity, delay: pos.delay }}
          className="absolute h-1.5 w-1.5 rounded-full bg-primary-soft"
          style={{ top: pos.top, left: pos.left }}
        />
      ))}
    </div>
  );
}

export function LandingPage() {
  const { session } = useAuth();
  const primaryCta = session ? '/app' : '/signup';
  const primaryLabel = session ? 'Open your dashboard' : 'BEGIN YOUR AWAKENING';

  return (
    <div className="min-h-dvh bg-void text-ink">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-line/60 bg-void/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="ARISE home">
            <AriseWordmark markSize={26} textSize="text-base" />
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-muted md:flex">
            <a href="#philosophy" className="transition-colors hover:text-ink">Philosophy</a>
            <a href="#paths" className="transition-colors hover:text-ink">Paths</a>
            <a href="#system" className="transition-colors hover:text-ink">Progression</a>
            <a href="#faq" className="transition-colors hover:text-ink">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            {!session && (
              <Link to="/login">
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
            )}
            <Link to={primaryCta}>
              <Button size="sm">{session ? 'Dashboard' : 'Get started'}</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="arcane-bg relative overflow-hidden">
        <div className="grid-veil absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-20 sm:px-6 sm:pt-24 lg:pt-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <AriseLockup className="items-start" />
              <h2 className="mt-8 font-display text-3xl leading-tight font-bold text-ink sm:text-5xl">
                Become the strongest
                <br />
                <span className="text-gradient">version of yourself.</span>
              </h2>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
                Train your body. Sharpen your mind. Master your skills. Every real-world
                achievement moves you forward — quests, XP, attributes and ranks built on what you
                actually do.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to={primaryCta}>
                  <Button size="lg" className="w-full sm:w-auto">
                    {primaryLabel} <ArrowRight className="h-4 w-4" aria-hidden />
                  </Button>
                </Link>
                <a href="#paths">
                  <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                    EXPLORE THE SYSTEM
                  </Button>
                </a>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-3 text-xs text-faint">
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-success" aria-hidden /> Row Level Security
                </span>
                <span className="inline-flex items-center gap-2">
                  <Fingerprint className="h-4 w-4 text-highlight" aria-hidden /> Private by default
                </span>
                <span className="inline-flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary-soft" aria-hidden /> Deterministic quests
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              <GatewayArt />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section id="philosophy" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <motion.div {...fade} className="mx-auto max-w-3xl text-center">
          <p className="rune-badge mb-3">THE PHILOSOPHY</p>
          <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
            Your real-life actions determine your progression
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted">
            Most self-improvement tools reward you for opening the app. ARISE rewards evidence:
            the workout you logged, the lesson you passed, the reflection you wrote, the focus
            block you finished. The system cannot be farmed — it only reflects what happened in
            the real world.
          </p>
        </motion.div>

        <motion.div {...fade} className="mt-12 grid gap-5 sm:grid-cols-3">
          {[
            {
              icon: ScrollText,
              title: 'Quests, not chores',
              copy: 'Each day ships a focused set with clear acceptance criteria, durations and XP rewards.',
            },
            {
              icon: Gauge,
              title: 'Attributes that mean something',
              copy: 'Six indicators derived from real activity — strength, endurance, mobility, technical knowledge, problem solving, discipline.',
            },
            {
              icon: Trophy,
              title: 'Ranks you cannot fake',
              copy: 'Rank requires milestones across all three paths — lessons passed, sessions logged, consistency held.',
            },
          ].map((item) => (
            <div key={item.title} className="panel rounded-2xl p-6">
              <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl border border-primary/30 bg-primary/10">
                <item.icon className="h-5 w-5 text-primary-soft" aria-hidden />
              </span>
              <h3 className="font-display text-lg font-semibold text-ink">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.copy}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Paths */}
      <section id="paths" className="border-y border-line/60 bg-abyss/40 py-20">
        <div className="mx-auto max-w-6xl scroll-mt-20 px-4 sm:px-6">
          <motion.div {...fade} className="mb-12 max-w-2xl">
            <p className="rune-badge mb-3">THREE DEVELOPMENT PATHS</p>
            <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
              Body. Mind. Will.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted">
              Balanced hunters advance. Neglect a path and the rank requirements will tell on you.
            </p>
          </motion.div>

          <div className="grid gap-5 lg:grid-cols-3">
            {PATHS.map((path, index) => {
              const Icon = PATH_ICONS[path.id];
              return (
                <motion.div
                  key={path.id}
                  {...fade}
                  transition={{ ...fade.transition, delay: index * 0.08 }}
                  className="relative overflow-hidden rounded-2xl border border-line bg-surface/70 p-6"
                >
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-[3px]"
                    style={{ background: `linear-gradient(90deg, ${path.color}, transparent)` }}
                  />
                  <Icon className="mb-4 h-7 w-7" style={{ color: path.color }} aria-hidden />
                  <h3 className="font-display text-xl font-bold text-ink">{path.name}</h3>
                  <p className="rune-badge mt-1 text-[0.625rem]" style={{ color: path.color }}>
                    {path.tagline}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{path.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="system" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <motion.div {...fade}>
            <p className="rune-badge mb-3">QUESTS · XP · LEVELS</p>
            <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
              One progression engine, fully explained
            </h2>
            <ol className="mt-8 space-y-5">
              {[
                'Accept today’s quests — each with instructions and acceptance criteria.',
                'Do the real work, then complete the quest with evidence.',
                'XP is awarded exactly once, by the server, from configuration — never from the browser.',
                'Level follows a documented curve: XP to reach level L = 100 × (L − 1)².',
                'Attributes, skills and achievements recompute from your records automatically.',
              ].map((step, i) => (
                <li key={step} className="flex gap-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/10 font-mono text-sm font-bold text-primary-soft">
                    {i + 1}
                  </span>
                  <p className="pt-1 text-sm leading-relaxed text-muted">{step}</p>
                </li>
              ))}
            </ol>

            <div className="mt-8 grid grid-cols-3 gap-3">
              {(
                [
                  ['Easy quest', XP_REWARDS.easy],
                  ['Medium quest', XP_REWARDS.medium],
                  ['Hard quest', XP_REWARDS.hard],
                ] as const
              ).map(([label, xp]) => (
                <div key={label} className="rounded-xl border border-line bg-abyss/50 px-4 py-3 text-center">
                  <p className="font-mono text-xl font-bold text-gradient-accent">+{xp}</p>
                  <p className="text-[0.6875rem] uppercase tracking-[0.14em] text-faint">{label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div {...fade} className="relative">
            <div className="energy-frame rounded-3xl border border-line bg-surface/80 p-6 shadow-pop">
              <div className="mb-5 flex items-center justify-between">
                <Badge variant="warning">Interface preview</Badge>
                <span className="text-xs text-faint">Illustrative data</span>
              </div>

              <div className="flex items-center gap-4">
                <RankBadge tier="D" size="lg" showName={false} />
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold text-ink">Hunter</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Flame className="h-3.5 w-3.5 text-warning" aria-hidden /> 12-day streak
                    </span>
                    <span>· Level 4 · 620 XP</span>
                  </div>
                </div>
              </div>

              <ProgressBar value={62} className="mt-4" label="Preview level progress" />

              <div className="mt-5 space-y-2.5">
                {[
                  { name: 'Vitality', color: '#34d399', pct: 48 },
                  { name: 'Intelligence', color: '#38bdf8', pct: 72 },
                  { name: 'Discipline', color: '#a78bfa', pct: 36 },
                ].map((row) => (
                  <div key={row.name} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-xs text-muted">{row.name}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line/70">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${row.pct}%`, background: row.color }}
                      />
                    </div>
                    <span className="w-8 text-right font-mono text-xs text-faint">{row.pct}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-xl border border-line/70 bg-abyss/50 p-4">
                <p className="rune-badge mb-2">TODAY&rsquo;S QUEST</p>
                <p className="text-sm font-semibold text-ink">Incline Push-Up Progression</p>
                <p className="mt-1 text-xs text-muted">
                  4 sets of 5–10 reps · 15 min · Medium
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <Badge variant="primary">Vitality</Badge>
                  <span className="font-mono text-sm font-bold text-primary-soft">+25 XP</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Ranks */}
      <section className="border-y border-line/60 bg-abyss/40 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div {...fade} className="mb-12 max-w-2xl">
            <p className="rune-badge mb-3">THE RANK LADDER</p>
            <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
              From Awakening to Transcendent
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted">
              Ranks combine level, quest volume, active days, achievements and demonstrated skill
              across all three paths.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {RANK_LADDER.map((rank, index) => (
              <motion.div
                key={rank.tier}
                {...fade}
                transition={{ ...fade.transition, delay: index * 0.05 }}
                className={cn(
                  'rounded-2xl border border-line bg-surface/70 p-5',
                  rank.tier === 'SS' && 'lg:col-span-1',
                )}
              >
                <RankBadge tier={rank.tier} size="sm" />
                <p className="mt-3 font-display text-sm font-semibold text-ink">{rank.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{rank.description}</p>
                {rank.requirements.length > 0 && (
                  <p className="mt-3 font-mono text-[0.6875rem] text-faint">
                    {rank.requirements[0].label}
                    {rank.requirements.length > 1 && ` + ${rank.requirements.length - 1} more`}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-20 sm:px-6">
        <motion.div {...fade} className="mb-10 text-center">
          <p className="rune-badge mb-3">FREQUENTLY ASKED</p>
          <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">Straight answers</h2>
        </motion.div>

        <motion.div {...fade} className="space-y-3">
          {FAQS.map((faq) => (
            <details key={faq.q} className="group panel rounded-2xl px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-ink">
                {faq.q}
                <ChevronDown className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{faq.a}</p>
            </details>
          ))}
        </motion.div>
      </section>

      {/* Final CTA */}
      <section className="arcane-bg relative overflow-hidden border-t border-line/60 py-24">
        <div className="grid-veil absolute inset-0" aria-hidden />
        <motion.div {...fade} className="relative mx-auto max-w-2xl px-4 text-center">
          <AriseMark size={52} className="mx-auto" />
          <h2 className="mt-6 font-display text-3xl font-bold text-ink sm:text-4xl">
            The system is waiting for your first quest
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted">
            No credit card. No ads. No public profile. Just a progression system that measures
            what you actually do.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to={primaryCta}>
              <Button size="lg">
                {primaryLabel} <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </Link>
          </div>
          <p className="mt-6 inline-flex items-center gap-2 text-xs text-faint">
            <Lock className="h-3.5 w-3.5" aria-hidden /> Your records are private to your account.
          </p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line/60 bg-abyss/60">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <AriseWordmark markSize={24} textSize="text-sm" />
              <p className="mt-4 max-w-xs text-xs leading-relaxed text-muted">
                A real-life RPG progression platform for fitness, technical mastery and discipline.
                Original design, original content.
              </p>
            </div>
            <div>
              <p className="mb-3 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-faint">
                Product
              </p>
              <ul className="space-y-2 text-sm text-muted">
                <li><a href="#philosophy" className="hover:text-ink">Philosophy</a></li>
                <li><a href="#paths" className="hover:text-ink">Development paths</a></li>
                <li><a href="#system" className="hover:text-ink">Progression system</a></li>
                <li><a href="#faq" className="hover:text-ink">FAQ</a></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-faint">
                Account
              </p>
              <ul className="space-y-2 text-sm text-muted">
                <li><Link to="/signup" className="hover:text-ink">Create account</Link></li>
                <li><Link to="/login" className="hover:text-ink">Sign in</Link></li>
                <li><Link to="/forgot-password" className="hover:text-ink">Recover access</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-faint">
                Principles
              </p>
              <ul className="space-y-2 text-sm text-muted">
                <li>Progress over perfection</li>
                <li>Rest is part of the plan</li>
                <li>Authorized practice only</li>
                <li>Your data stays yours</li>
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-line/60 pt-6 text-xs text-faint sm:flex-row">
            <p>© {new Date().getFullYear()} ARISE. Built as an original product — not affiliated with any anime or game.</p>
            <p className="inline-flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> Your life. Your quest. Your evolution.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
