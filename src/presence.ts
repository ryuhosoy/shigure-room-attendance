import type { AttendanceUser } from './types';

export const WINDOW_DAYS = 14;
export const RECENT_DAYS = 7;

export function tokyoToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function shiftDate(isoDate: string, delta: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + delta);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function recentDates(end: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => shiftDate(end, index - (count - 1)));
}

export function daysBetween(start: string, end: string): number {
  const startMs = Date.parse(`${start}T00:00:00Z`);
  const endMs = Date.parse(`${end}T00:00:00Z`);
  return Math.round((endMs - startMs) / 86_400_000);
}

function toDateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  const head = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(head)) return head;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return tokyoToday(parsed);
}

export interface PresenceRow {
  user: AttendanceUser;
  dates: Set<string>;
  daysSince: number | null;
  recentCount: number;
}

export function presenceRow(user: AttendanceUser, today: string): PresenceRow {
  const dates = new Set<string>();
  for (const visit of user.visits ?? []) {
    const date = toDateOnly(visit.visit_date);
    if (date) dates.add(date);
  }
  if (user.visited_today) dates.add(today);
  if (dates.size === 0) {
    const fallback = toDateOnly(user.last_entered_at);
    if (fallback) dates.add(fallback);
  }

  const last = [...dates].sort().at(-1) ?? null;
  let daysSince: number | null = null;
  if (last) {
    daysSince = daysBetween(last, today);
    if (daysSince < 0) daysSince = 0;
  }

  const weekStart = shiftDate(today, -(RECENT_DAYS - 1));
  let recentCount = 0;
  for (const date of dates) {
    if (date >= weekStart && date <= today) recentCount += 1;
  }

  return { user, dates, daysSince, recentCount };
}

export function recencyLabel(daysSince: number | null): string {
  if (daysSince === null) return '記録なし';
  if (daysSince <= 0) return '今日';
  if (daysSince === 1) return '昨日';
  return `${daysSince}日前`;
}

export function comparePresence(a: PresenceRow, b: PresenceRow): number {
  const rank = (days: number | null) => (days === null ? Number.POSITIVE_INFINITY : days);
  const left = rank(a.daysSince);
  const right = rank(b.daysSince);
  if (left !== right) return right > left ? 1 : -1;
  return a.user.display_name.localeCompare(b.user.display_name, 'ja');
}

export function dayLabel(isoDate: string, previous: string | null): string {
  const month = Number(isoDate.slice(5, 7));
  const day = Number(isoDate.slice(8, 10));
  if (!previous || previous.slice(5, 7) !== isoDate.slice(5, 7)) return `${month}/${day}`;
  return String(day);
}
