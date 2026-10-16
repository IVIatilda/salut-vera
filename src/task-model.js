export const TASK_STATUSES = [
  { value: 'inbox', label: 'Входящие' },
  { value: 'planned', label: 'Запланирована' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'delegated', label: 'Делегирована' },
  { value: 'completed', label: 'Завершена' },
  { value: 'cancelled', label: 'Отменена' },
];

export const IMPORTANCE_LEVELS = [
  { value: 'unset', label: 'Не указана' },
  { value: 'low', label: 'Низкая' },
  { value: 'normal', label: 'Обычная' },
  { value: 'high', label: 'Высокая' },
];

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function normalizeTask(task, today = localDateKey()) {
  const isLegacyTask = !task.status;
  const status = task.completed ? 'completed' : task.status || 'planned';
  return {
    description: '',
    status,
    completed: status === 'completed',
    importance: 'unset',
    isUrgent: false,
    origin: 'unclear',
    area: 'Без сферы',
    estimate: 15,
    trackedSeconds: 0,
    scheduledDate: isLegacyTask ? today : '',
    dueDate: '',
    parentTaskId: null,
    completedAt: status === 'completed' ? task.completedAt || task.updatedAt || task.createdAt : null,
    ...task,
    status,
    completed: status === 'completed',
    area: task.area || 'Без сферы',
  };
}

export function createTask(title, view = 'inbox', today = localDateKey()) {
  const isToday = view === 'today';
  return normalizeTask({
    id: crypto.randomUUID(),
    title: title.trim(),
    status: isToday ? 'planned' : 'inbox',
    completed: false,
    scheduledDate: isToday ? today : '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }, today);
}

export function isTaskCompleted(task) {
  return task.status === 'completed' || task.completed;
}

export function taskMatchesView(task, view, filter = 'active', today = localDateKey()) {
  const completed = isTaskCompleted(task);
  const cancelled = task.status === 'cancelled';

  if (view === 'today') {
    if (cancelled || task.parentTaskId) return false;
    return task.scheduledDate === today || Boolean(task.dueDate && task.dueDate <= today);
  }

  if (view === 'inbox') {
    return !completed && !cancelled && !task.parentTaskId && task.status === 'inbox';
  }

  if (task.parentTaskId) return false;
  if (filter === 'completed') return completed;
  if (filter === 'upcoming') {
    return !completed && !cancelled && Boolean(task.scheduledDate && task.scheduledDate > today);
  }
  if (filter === 'no_date') {
    return !completed && !cancelled && !task.scheduledDate && !task.dueDate;
  }
  return !cancelled;
}

export function sortTasks(tasks) {
  return [...tasks].sort((first, second) => {
    if (isTaskCompleted(first) !== isTaskCompleted(second)) return isTaskCompleted(first) ? 1 : -1;
    if (first.isUrgent !== second.isUrgent) return first.isUrgent ? -1 : 1;
    const importanceOrder = { high: 0, normal: 1, low: 2, unset: 3 };
    const importanceDifference = importanceOrder[first.importance] - importanceOrder[second.importance];
    if (importanceDifference) return importanceDifference;
    return (first.scheduledDate || first.dueDate || '9999-12-31')
      .localeCompare(second.scheduledDate || second.dueDate || '9999-12-31');
  });
}
