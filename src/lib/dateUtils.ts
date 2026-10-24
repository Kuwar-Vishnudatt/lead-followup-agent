const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

// Date-only values are stored and compared in the viewer's local calendar,
// never UTC — `toISOString()` shifts to UTC first, which silently rolls the
// date backward for anyone east of Greenwich after their local midnight but
// before UTC midnight (e.g. it's already "tomorrow" in India at 1am IST).
export function toDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse a "YYYY-MM-DD" value as local midnight (never via `new Date(str)`,
 * which the spec parses as UTC midnight and would reintroduce the same
 * UTC/local mismatch when compared against other local-time dates). */
export function parseDateOnly(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function daysBetween(a: Date, b: Date): number {
  const diff = startOfDay(b).getTime() - startOfDay(a).getTime();
  return Math.round(diff / DAY_MS);
}

export function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Look for a relative/weekday date reference in free text and resolve it against `from`. */
export function extractDateHint(text: string, from: Date): Date | null {
  const t = text.toLowerCase();

  if (/\btomorrow\b/.test(t)) return addDays(from, 1);
  if (/\btoday\b/.test(t)) return from;

  const inDaysMatch = t.match(/\bin (\d+)\s*days?\b/);
  if (inDaysMatch) return addDays(from, parseInt(inDaysMatch[1], 10));

  if (/\bin a week\b|\bnext week\b/.test(t)) return addDays(from, 7);
  if (/\ba few days\b/.test(t)) return addDays(from, 3);
  if (/\bend of (the |this )?week\b/.test(t)) return nextWeekday(from, 5);
  if (/\bend of (the |this )?month\b/.test(t)) return addDays(from, 14);

  for (let i = 0; i < WEEKDAYS.length; i++) {
    if (new RegExp(`\\b${WEEKDAYS[i]}\\b`).test(t)) {
      return nextWeekday(from, i);
    }
  }

  return null;
}

function nextWeekday(from: Date, targetDow: number): Date {
  const fromDow = from.getDay();
  let delta = targetDow - fromDow;
  if (delta <= 0) delta += 7;
  return addDays(from, delta);
}

export function formatRelativeLabel(dateStr: string, now: Date): string {
  const target = startOfDay(parseDateOnly(dateStr));
  const today = startOfDay(now);
  const diff = daysBetween(today, target);

  if (diff < 0) {
    const n = Math.abs(diff);
    return `Overdue by ${n} day${n === 1 ? "" : "s"}`;
  }
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff <= 6) return `In ${diff} days`;
  return target.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function isOverdue(dateStr: string, now: Date): boolean {
  return daysBetween(startOfDay(now), startOfDay(parseDateOnly(dateStr))) < 0;
}

export function isToday(dateStr: string, now: Date): boolean {
  return daysBetween(startOfDay(now), startOfDay(parseDateOnly(dateStr))) === 0;
}
