import { getHabitDaySummary, getScheduledHabitsForDate } from '../../habits/model/habit-model.js';
import { isTaskCompleted } from '../../tasks/model/task-model.js';

export const CALENDAR_WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
export const CALENDAR_ITEM_KINDS = ['important', 'reminder'];
export const CALENDAR_RECURRENCES = ['none', 'daily', 'weekly', 'monthly', 'yearly', 'interval', 'weekdays'];

export function calendarDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseCalendarDate(value) {
  return new Date(`${value}T12:00:00`);
}

export function getCalendarMonth(value = new Date()) {
  const date = value instanceof Date ? value : parseCalendarDate(value);
  return new Date(date.getFullYear(), date.getMonth(), 1, 12);
}

export function shiftCalendarMonth(value, offset) {
  const month = getCalendarMonth(value);
  return new Date(month.getFullYear(), month.getMonth() + offset, 1, 12);
}

export function getCalendarMonthDays(value = new Date()) {
  const month = getCalendarMonth(value);
  const firstWeekday = month.getDay() || 7;
  const gridStart = new Date(month);
  gridStart.setDate(month.getDate() - firstWeekday + 1);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return {
      date,
      dateKey: calendarDateKey(date),
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === month.getMonth(),
    };
  });
}

export function formatCalendarMonth(value) {
  const month = getCalendarMonth(value);
  const label = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(month);
  return label.charAt(0).toLocaleUpperCase('ru-RU') + label.slice(1);
}

export function formatSelectedDate(value) {
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(parseCalendarDate(value));
}

export function normalizeCalendarItem(item = {}) {
  const now = new Date().toISOString();
  const recurrence = CALENDAR_RECURRENCES.includes(item.recurrence)
    ? item.recurrence
    : item.repeatsYearly ? 'yearly' : 'none';
  const weekdays = Array.isArray(item.weekdays)
    ? [...new Set(item.weekdays.map(Number).filter((day) => day >= 1 && day <= 7))].sort()
    : [];

  return {
    title: '',
    kind: 'important',
    startDate: '',
    endDate: '',
    time: '',
    note: '',
    recurrence: 'none',
    intervalDays: 2,
    weekdays: [],
    createdAt: now,
    updatedAt: now,
    ...item,
    title: item.title || '',
    kind: CALENDAR_ITEM_KINDS.includes(item.kind) ? item.kind : 'important',
    startDate: item.startDate || item.date || '',
    endDate: item.endDate || '',
    time: /^([01]\d|2[0-3]):[0-5]\d$/.test(item.time || '') ? item.time : '',
    note: item.note || '',
    recurrence,
    intervalDays: Math.max(1, Math.floor(Number(item.intervalDays) || 1)),
    weekdays,
  };
}

export function normalizeImportantDate(item) {
  return normalizeCalendarItem(item);
}

export function createCalendarItem(date = calendarDateKey(new Date()), kind = 'important') {
  const now = new Date().toISOString();
  return normalizeCalendarItem({
    id: crypto.randomUUID(),
    kind,
    startDate: date,
    createdAt: now,
    updatedAt: now,
  });
}

export function createImportantDate(date = calendarDateKey(new Date())) {
  return createCalendarItem(date, 'important');
}

function localDayNumber(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

function weekdayNumber(dateKey) {
  const day = parseCalendarDate(dateKey).getDay();
  return day === 0 ? 7 : day;
}

export function calendarItemOccursOn(sourceItem, dateKey) {
  const item = normalizeCalendarItem(sourceItem);
  if (!item.startDate || !dateKey || dateKey < item.startDate) return false;
  if (item.endDate && dateKey > item.endDate) return false;

  const dayDistance = localDayNumber(dateKey) - localDayNumber(item.startDate);
  if (item.recurrence === 'daily') return true;
  if (item.recurrence === 'weekly') return dayDistance % 7 === 0;
  if (item.recurrence === 'monthly') return dateKey.slice(8) === item.startDate.slice(8);
  if (item.recurrence === 'yearly') return dateKey.slice(5) === item.startDate.slice(5);
  if (item.recurrence === 'interval') return dayDistance % item.intervalDays === 0;
  if (item.recurrence === 'weekdays') return item.weekdays.includes(weekdayNumber(dateKey));
  return item.startDate === dateKey;
}

export function importantDateOccursOn(item, dateKey) {
  return calendarItemOccursOn(item, dateKey);
}

export function describeCalendarItemSchedule(sourceItem) {
  const item = normalizeCalendarItem(sourceItem);
  if (item.recurrence === 'daily') return 'Каждый день';
  if (item.recurrence === 'weekly') return 'Каждую неделю';
  if (item.recurrence === 'monthly') return 'Каждый месяц';
  if (item.recurrence === 'yearly') return 'Каждый год';
  if (item.recurrence === 'interval') return `Каждые ${item.intervalDays} дн.`;
  if (item.recurrence === 'weekdays') {
    return item.weekdays.map((day) => CALENDAR_WEEKDAYS[day - 1]).join(', ') || 'Дни не выбраны';
  }
  return 'Без повтора';
}

export function getCalendarEntries(tasks, projects, calendarItems, dateKey) {
  const entries = [];

  calendarItems.filter((item) => calendarItemOccursOn(item, dateKey)).forEach((sourceItem) => {
    const item = normalizeCalendarItem(sourceItem);
    entries.push({
      id: `${item.kind}:${item.id}:${dateKey}`,
      sourceId: item.id,
      type: item.kind,
      title: item.title,
      time: item.time,
      item,
    });
  });

  tasks.filter((task) => task.status !== 'cancelled').forEach((task) => {
    if (task.scheduledDate === dateKey) {
      entries.push({
        id: `task:${task.id}:scheduled`,
        sourceId: task.id,
        type: 'task',
        title: task.title,
        completed: isTaskCompleted(task),
        item: task,
      });
    }
    if (task.dueDate === dateKey && task.dueDate !== task.scheduledDate) {
      entries.push({
        id: `task:${task.id}:due`,
        sourceId: task.id,
        type: 'deadline',
        title: task.title,
        completed: isTaskCompleted(task),
        item: task,
      });
    }
  });

  projects.filter((project) => project.status !== 'archived' && project.targetDate === dateKey).forEach((project) => {
    entries.push({ id: `project:${project.id}`, sourceId: project.id, type: 'project', title: project.title, item: project });
  });

  const order = { important: 0, reminder: 1, deadline: 2, project: 3, task: 4 };
  return entries.sort((first, second) => {
    const typeOrder = order[first.type] - order[second.type];
    if (typeOrder !== 0) return typeOrder;
    return (first.time || '99:99').localeCompare(second.time || '99:99');
  });
}

export function getCalendarHabitItems(habits, logs, dateKey, todayKey) {
  const isFuture = dateKey > todayKey;
  return getScheduledHabitsForDate(habits, dateKey)
    .filter((habit) => {
      if (!habit.createdAt) return true;
      const createdAt = new Date(habit.createdAt);
      return Number.isNaN(createdAt.getTime()) || calendarDateKey(createdAt) <= dateKey;
    })
    .map((habit) => {
      const dayLogs = logs.filter((log) => log.habitId === habit.id && log.occurredOn === dateKey);
      const summary = getHabitDaySummary(habit, dayLogs);
      return {
        habit,
        summary,
        state: isFuture && summary.state === 'empty' ? 'future' : summary.state,
      };
    });
}

export function describeHabitCalendarState(item, dateKey, todayKey) {
  if (item.state === 'done') return item.habit.direction === 'reduce' ? 'Без эпизодов' : 'Выполнено';
  if (item.state === 'partial') return `Частично: ${item.summary.value} из ${item.habit.targetValue}`;
  if (item.state === 'episode') return `${item.summary.value} эп.`;
  if (item.state === 'future') return 'Запланировано';
  return dateKey === todayKey ? 'Пока без отметки' : 'Нет отметки';
}
