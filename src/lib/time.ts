/**
 * Timezone-safe date helpers.
 *
 * ARISE groups activity by the *user's* configured time zone, never by the
 * browser's local zone. Everything is built on Intl.DateTimeFormat so we do
 * not need an extra timezone library and DST is handled by the platform.
 */

const dayKeyFormatterCache = new Map<string, Intl.DateTimeFormat>();

function dayKeyFormatter(timeZone: string): Intl.DateTimeFormat {
  let fmt = dayKeyFormatterCache.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    dayKeyFormatterCache.set(timeZone, fmt);
  }
  return fmt;
}

export type DayKey = string; // 'YYYY-MM-DD'

/** Day key (YYYY-MM-DD) for an instant, evaluated in the given time zone. */
export function toDayKey(date: Date, timeZone: string): DayKey {
  return dayKeyFormatter(timeZone).format(date);
}

/** Day key for "now" in the given time zone. */
export function todayKey(timeZone: string, now: Date = new Date()): DayKey {
  return toDayKey(now, timeZone);
}

/** Parse a YYYY-MM-DD key into a Date at local midnight (safe for math only). */
export function parseDayKey(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Add (or subtract) whole days to a day key. DST-safe: operates on dates. */
export function addDays(key: DayKey, days: number): DayKey {
  const d = parseDayKey(key);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Day of week for a key in the *user's* zone: 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(key: DayKey): number {
  return parseDayKey(key).getDay();
}

/** Inclusive list of day keys from start to end. */
export function dayRange(start: DayKey, end: DayKey): DayKey[] {
  const out: DayKey[] = [];
  let cursor = start;
  let guard = 0;
  while (cursor <= end && guard < 3650) {
    out.push(cursor);
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return out;
}

/** Days between two keys (positive when `to` is later). */
export function diffDays(from: DayKey, to: DayKey): number {
  return Math.round((parseDayKey(to).getTime() - parseDayKey(from).getTime()) / 86_400_000);
}

/** Human label like "Mon, Oct 13". */
export function formatDayKey(key: DayKey, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...opts,
  }).format(parseDayKey(key));
}

/** Short label like "Oct 13". */
export function formatShortDay(key: DayKey): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
    parseDayKey(key),
  );
}

/** The Monday-based week start for a day key. */
export function weekStart(key: DayKey): DayKey {
  const d = parseDayKey(key);
  const shift = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - shift);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Resolve the browser's best-guess time zone, falling back to UTC. */
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Relative time label such as "2h ago" / "in 3d". */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  const deltaSec = Math.round((then - now.getTime()) / 1000);
  const abs = Math.abs(deltaSec);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (abs < 60) return rtf.format(deltaSec, 'second');
  if (abs < 3600) return rtf.format(Math.round(deltaSec / 60), 'minute');
  if (abs < 86_400) return rtf.format(Math.round(deltaSec / 3600), 'hour');
  if (abs < 2_592_000) return rtf.format(Math.round(deltaSec / 86_400), 'day');
  return rtf.format(Math.round(deltaSec / 2_592_000), 'month');
}
