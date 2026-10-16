import { cn } from '@/lib/cn';

/**
 * ARISE identity — original vector artwork. The mark is an upward rift: two
 * ascending blades breaking a containment frame, rendered with the product
 * gradient. No third-party or copyrighted assets are used.
 */
export function AriseMark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="arise-mark-grad" x1="4" y1="28" x2="28" y2="4" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="0.55" stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#38BDF8" />
        </linearGradient>
        <linearGradient id="arise-mark-core" x1="16" y1="6" x2="16" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F8FAFC" />
          <stop offset="1" stopColor="#C4B5FD" />
        </linearGradient>
      </defs>
      <path
        d="M16 1.5 30.5 16 16 30.5 1.5 16 16 1.5Z"
        stroke="url(#arise-mark-grad)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        opacity="0.85"
      />
      <path
        d="M16 7.5c3.4 3.1 6.2 6.9 8.4 11.4H20l-4-4.6-4 4.6H7.6C9.8 14.4 12.6 10.6 16 7.5Z"
        fill="url(#arise-mark-grad)"
        opacity="0.35"
      />
      <path
        d="M16 9.8c2.3 2.4 4.3 5.2 5.9 8.4h-4.1l-1.8-2.2-1.8 2.2h-4.1c1.6-3.2 3.6-6 5.9-8.4Z"
        fill="url(#arise-mark-core)"
      />
    </svg>
  );
}

export function AriseWordmark({
  className,
  markSize = 30,
  textSize = 'text-xl',
}: {
  className?: string;
  markSize?: number;
  textSize?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <AriseMark size={markSize} />
      <span
        className={cn(
          'font-display font-bold tracking-[0.34em] text-ink',
          textSize,
        )}
      >
        ARISE
      </span>
    </span>
  );
}

/** Full hero lockup with the product tagline. */
export function AriseLockup({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <AriseMark size={64} />
      <h1 className="font-display text-5xl font-bold tracking-[0.42em] text-ink sm:text-7xl">
        ARISE
      </h1>
      <p className="rune-badge text-[0.7rem] tracking-[0.34em] text-muted">
        YOUR LIFE · YOUR QUEST · YOUR EVOLUTION
      </p>
    </div>
  );
}
