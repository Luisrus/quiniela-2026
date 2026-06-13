const TIMEZONE = 'America/Guatemala';

export function dayKeyFromDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(date);
}

export function todayDayKey(): string {
  return dayKeyFromDate(new Date());
}

export function dayKeyBounds(dayKey: string): { readonly start: Date; readonly end: Date } {
  const [year, month, day] = dayKey.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, 6, 0, 0, 0));
  const end = new Date(Date.UTC(year, month - 1, day + 1, 6, 0, 0, 0));

  return { start, end };
}

export function dayKeysFromTo(fromDayKey: string, toDayKey: string): readonly string[] {
  if (fromDayKey > toDayKey) {
    return [];
  }

  const keys: string[] = [];
  const [startYear, startMonth, startDay] = fromDayKey.split('-').map(Number);
  let cursor = new Date(Date.UTC(startYear, startMonth - 1, startDay, 12, 0, 0, 0));
  const endMs = dayKeyBounds(toDayKey).end.getTime();

  while (cursor.getTime() < endMs) {
    keys.push(dayKeyFromDate(cursor));
    cursor = new Date(cursor.getTime() + 86_400_000);
  }

  return keys;
}

export function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values.filter((value) => value.trim() !== ''))];
}
