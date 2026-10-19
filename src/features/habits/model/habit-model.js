export const HABIT_DIRECTIONS = [
  { value: 'build', label: 'Развивать' },
  { value: 'reduce', label: 'Ослаблять' },
];

export const HABIT_TRACKING_TYPES = [
  { value: 'check', label: 'Отметка выполнения' },
  { value: 'count', label: 'Количество' },
  { value: 'duration', label: 'Время' },
];

export const HABIT_STATUSES = [
  { value: 'active', label: 'Активная' },
  { value: 'archived', label: 'В архиве' },
];

export const WEEKDAYS = [
  { value: 1, short: 'Пн', label: 'Понедельник' },
  { value: 2, short: 'Вт', label: 'Вторник' },
  { value: 3, short: 'Ср', label: 'Среда' },
  { value: 4, short: 'Чт', label: 'Четверг' },
  { value: 5, short: 'Пт', label: 'Пятница' },
  { value: 6, short: 'Сб', label: 'Суббота' },
  { value: 7, short: 'Вс', label: 'Воскресенье' },
];

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function normalizeHabit(habit) {
  const now = new Date().toISOString();
  const direction = habit.direction === 'reduce' ? 'reduce' : 'build';
  const trackingType = HABIT_TRACKING_TYPES.some((item) => item.value === habit.trackingType)
    ? habit.trackingType
    : direction === 'reduce' ? 'count' : 'check';
  const scheduleDays = Array.isArray(habit.scheduleDays) && habit.scheduleDays.length
    ? [...new Set(habit.scheduleDays.map(Number).filter((day) => day >= 1 && day <= 7))].sort()
    : WEEKDAYS.map((day) => day.value);

  return {
    title: '',
    description: '',
    direction,
    identityStatement: '',
    cueWhen: '',
    cueWhere: '',
    cueAfter: '',
    twoMinuteVersion: '',
    environmentChange: '',
    immediateReward: '',
    trackingType,
    targetValue: 1,
    targetUnit: trackingType === 'duration' ? 'мин' : 'раз',
    scheduleDays,
    roleId: null,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    ...habit,
    direction,
    trackingType,
    scheduleDays,
    targetValue: Math.max(1, Number(habit.targetValue) || 1),
    status: habit.status === 'archived' ? 'archived' : 'active',
  };
}

export function createHabit() {
  const now = new Date().toISOString();
  return normalizeHabit({
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  });
}

export function normalizeHabitLog(log) {
  const createdAt = log.createdAt || new Date().toISOString();
  return {
    status: 'done',
    value: 0,
    note: '',
    occurredAt: null,
    createdAt,
    ...log,
    value: Math.max(0, Number(log.value) || 0),
    occurredAt: log.status === 'episode' ? log.occurredAt || createdAt : log.occurredAt || null,
  };
}

export function createHabitLog(habitId, occurredOn, status, value = 0, occurredAt = null) {
  const now = new Date().toISOString();
  return normalizeHabitLog({
    id: status === 'episode' ? crypto.randomUUID() : `${habitId}:${occurredOn}`,
    habitId,
    occurredOn,
    status,
    value,
    occurredAt: status === 'episode' ? occurredAt || now : occurredAt,
    createdAt: now,
    updatedAt: now,
  });
}

export function isHabitScheduledForDate(habit, value) {
  const date = typeof value === 'string' ? new Date(`${value}T12:00:00`) : value;
  const weekday = date.getDay() || 7;
  return habit.status === 'active' && habit.scheduleDays.includes(weekday);
}

export function getWeekDates(value = new Date()) {
  const date = typeof value === 'string' ? new Date(`${value}T12:00:00`) : new Date(value);
  const weekday = date.getDay() || 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - weekday + 1);

  return WEEKDAYS.map((_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return dateKey(day);
  });
}

export function getHabitLogState(habit, log) {
  if (!log) return 'empty';
  if (habit.direction === 'reduce') return log.status === 'episode' && log.value > 0 ? 'episode' : 'done';
  if (habit.trackingType === 'check') return log.status === 'done' ? 'done' : 'partial';
  return log.value >= habit.targetValue ? 'done' : 'partial';
}

export function canCompleteHabitTarget(habit) {
  return habit.direction === 'build' && habit.trackingType !== 'check';
}

export function getHabitDaySummary(habit, logs = []) {
  const dayLogs = Array.isArray(logs) ? logs : logs ? [logs] : [];
  if (habit.direction === 'reduce') {
    const episodeCount = dayLogs
      .filter((log) => log.status === 'episode')
      .reduce((total, log) => total + Math.max(1, Number(log.value) || 0), 0);
    if (episodeCount > 0) return { state: 'episode', value: episodeCount };
    return {
      state: dayLogs.some((log) => log.status === 'done') ? 'done' : 'empty',
      value: 0,
    };
  }

  const log = dayLogs.find((item) => item.id === `${habit.id}:${item.occurredOn}`) || dayLogs.at(-1);
  return { state: getHabitLogState(habit, log), value: log?.value || 0 };
}

export function getLatestHabitEpisode(logs, habitId, occurredOn) {
  return logs
    .filter((log) => log.habitId === habitId && log.occurredOn === occurredOn && log.status === 'episode')
    .reduce((latest, log) => {
      if (!latest) return log;
      const timestamp = log.occurredAt || log.createdAt || '';
      const latestTimestamp = latest.occurredAt || latest.createdAt || '';
      return timestamp > latestTimestamp ? log : latest;
    }, null);
}

export function getHabitWeekProgress(habit, logs, weekDates, today) {
  const logsByDate = new Map();
  logs.filter((log) => log.habitId === habit.id).forEach((log) => {
    const dayLogs = logsByDate.get(log.occurredOn) || [];
    dayLogs.push(log);
    logsByDate.set(log.occurredOn, dayLogs);
  });
  const plannedDates = weekDates.filter((day) => day <= today && isHabitScheduledForDate(habit, day));
  const completed = plannedDates.filter((day) => getHabitDaySummary(habit, logsByDate.get(day)).state === 'done').length;
  return { completed, planned: plannedDates.length };
}
