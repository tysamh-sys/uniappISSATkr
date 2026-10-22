import { DayOfWeek } from '@prisma/client';

export function timeToMinutes(timeStr: string): number {
  const parts = timeStr.split(':');
  if (parts.length !== 2) return 0;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  return hours * 60 + minutes;
}

export function isValidTimeFormat(timeStr: string): boolean {
  const regex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(timeStr);
}

export function isTimeOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);

  return Math.max(s1, s2) < Math.min(e1, e2);
}

export function normalizeDate(input?: string | Date): Date {
  if (!input) {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
  }
  if (typeof input === 'string') {
    const match = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return new Date(
        Date.UTC(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10), 0, 0, 0, 0)
      );
    }
    const d = new Date(input);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  }
  return new Date(Date.UTC(input.getFullYear(), input.getMonth(), input.getDate(), 0, 0, 0, 0));
}

export function getDayOfWeekFromDate(date: Date): DayOfWeek {
  const days: DayOfWeek[] = [
    DayOfWeek.SUNDAY,
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
    DayOfWeek.SATURDAY,
  ];
  return days[date.getUTCDay()];
}

export function formatDateToYYYYMMDD(date: Date): string {
  return date.toISOString().split('T')[0];
}
