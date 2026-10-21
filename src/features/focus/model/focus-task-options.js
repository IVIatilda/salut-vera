import { isTaskCompleted, localDateKey } from '../../tasks/model/task-model.js';

export function isFocusTaskOverdue(task, today = localDateKey()) {
  return Boolean(
    (task.scheduledDate && task.scheduledDate < today)
    || (task.dueDate && task.dueDate < today),
  );
}

export function getFocusTaskOptions(tasks, today = localDateKey()) {
  const eligibleTasks = tasks.filter((task) => {
    if (isTaskCompleted(task) || task.status === 'cancelled') return false;
    if (task.scheduledDate > today) return false;

    const hasNoDate = !task.scheduledDate && !task.dueDate;
    return task.scheduledDate === today || isFocusTaskOverdue(task, today) || hasNoDate;
  });

  return eligibleTasks
    .map((task, sourceIndex) => {
      const overdue = isFocusTaskOverdue(task, today);
      const isToday = task.scheduledDate === today && !overdue;
      return {
        task,
        sourceIndex,
        group: isToday ? 0 : overdue ? 1 : 2,
      };
    })
    .sort((first, second) => first.group - second.group || first.sourceIndex - second.sourceIndex)
    .map(({ task }) => ({
      value: task.id,
      label: task.title,
      overdue: isFocusTaskOverdue(task, today),
    }));
}
