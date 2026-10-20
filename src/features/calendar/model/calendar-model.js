import { getHabitDaySummary, getScheduledHabitsForDate } from '../../habits/model/habit-model.js';
import { isTaskCompleted } from '../../tasks/model/task-model.js';

export const CALENDAR_WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

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

export function normalizeImportantDate(item) {
  const now = new Date().toISOString();
  return {
    title: '',
    date: '',
    note: '',
    repeatsYearly: false,
    createdAt: now,
    updatedAt: now,
    ...item,
    title: item.title || '',
    date: item.date || '',
    note: item.note || '',
    repeatsYearly: Boolean(item.repeatsYearly),
  };
}

export function createImportantDate(date = calendarDateKey(new Date())) {
  const now = new Date().toISOString();
  return normalizeImportantDate({
    id: crypto.randomUUID(),
    date,
    createdAt: now,
    updatedAt: now,
  });
}

export function importantDateOccursOn(item, dateKey) {
  if (!item.date || !dateKey) return false;
  return item.repeatsYearly ? item.date.slice(5) === dateKey.slice(5) : item.date === dateKey;
}

export function getCalendarEntries(tasks, projects, importantDates, dateKey) {
  const entries = [];

  importantDates.filter((item) => importantDateOccursOn(item, dateKey)).forEach((item) => {
    entries.push({ id: `important:${item.id}`, sourceId: item.id, type: 'important', title: item.title, item });
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

  const order = { important: 0, deadline: 1, project: 2, task: 3 };
  return entries.sort((first, second) => order[first.type] - order[second.type]);
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
