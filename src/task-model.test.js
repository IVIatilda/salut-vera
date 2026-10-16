import { describe, expect, it } from 'vitest';
import { createTask, normalizeTask, taskMatchesView } from './task-model.js';

describe('task model', () => {
  it('places a quick task from Today into today plan', () => {
    const task = createTask('Позвонить врачу', 'today', '2026-10-16');
    expect(task).toMatchObject({
      title: 'Позвонить врачу',
      status: 'planned',
      scheduledDate: '2026-10-16',
    });
  });

  it('places quick capture from Inbox into inbox without a date', () => {
    const task = createTask('Мысль', 'inbox', '2026-10-16');
    expect(task.status).toBe('inbox');
    expect(task.scheduledDate).toBe('');
  });

  it('keeps legacy tasks visible in Today', () => {
    const task = normalizeTask({ id: 'legacy', title: 'Старая задача', completed: false }, '2026-10-16');
    expect(taskMatchesView(task, 'today', 'active', '2026-10-16')).toBe(true);
  });

  it('includes overdue tasks in Today', () => {
    const task = normalizeTask({
      id: 'overdue',
      title: 'Просроченная',
      status: 'planned',
      dueDate: '2026-10-15',
    }, '2026-10-16');
    expect(taskMatchesView(task, 'today', 'active', '2026-10-16')).toBe(true);
  });

  it('keeps subtasks out of root lists', () => {
    const subtask = normalizeTask({
      id: 'child',
      parentTaskId: 'parent',
      title: 'Подзадача',
      status: 'planned',
      scheduledDate: '2026-10-16',
    }, '2026-10-16');

    expect(taskMatchesView(subtask, 'today', 'active', '2026-10-16')).toBe(false);
    expect(taskMatchesView(subtask, 'tasks', 'active', '2026-10-16')).toBe(false);
  });

  it('filters completed and undated tasks independently', () => {
    const completed = normalizeTask({ id: 'done', title: 'Готово', status: 'completed' });
    const undated = normalizeTask({ id: 'later', title: 'Без даты', status: 'inbox' });

    expect(taskMatchesView(completed, 'tasks', 'completed', '2026-10-16')).toBe(true);
    expect(taskMatchesView(undated, 'tasks', 'no_date', '2026-10-16')).toBe(true);
    expect(taskMatchesView(completed, 'tasks', 'no_date', '2026-10-16')).toBe(false);
  });
});
