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

    return task.scheduledDate === today || isFocusTaskOverdue(task, today);
  });

  return eligibleTasks
    .map((task, sourceIndex) => ({
      task,
      sourceIndex,
      group: task.scheduledDate === today && !isFocusTaskOverdue(task, today) ? 0 : 1,
    }))
    .sort((first, second) => first.group - second.group || first.sourceIndex - second.sourceIndex)
    .map(({ task }) => ({
      value: task.id,
      label: task.title,
      overdue: isFocusTaskOverdue(task, today),
    }));
}
