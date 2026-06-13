const TIMEZONE = 'America/Guatemala';
const VENTANA_DIAS = 2;

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

/** Hoy + el próximo día (2 en total), zona Guatemala. */
export function weekDayKeys(fromDayKey: string = todayDayKey()): readonly string[] {
  const [year, month, day] = fromDayKey.split('-').map(Number);
  const endDate = new Date(Date.UTC(year, month - 1, day + VENTANA_DIAS - 1, 12, 0, 0, 0));
  const toDayKey = dayKeyFromDate(endDate);

  return dayKeysFromTo(fromDayKey, toDayKey);
}

export function weekDateBounds(fromDayKey: string = todayDayKey()): {
  readonly start: Date;
  readonly end: Date;
} {
  const keys = weekDayKeys(fromDayKey);
  const first = keys[0];
  const last = keys[keys.length - 1];

  if (first === undefined || last === undefined) {
    return dayKeyBounds(fromDayKey);
  }

  return {
    start: dayKeyBounds(first).start,
    end: dayKeyBounds(last).end
  };
}

export function weekRangeKey(fromDayKey: string = todayDayKey()): string {
  const keys = weekDayKeys(fromDayKey);
  const first = keys[0] ?? fromDayKey;
  const last = keys[keys.length - 1] ?? fromDayKey;

  return `${first}_${last}`;
}
