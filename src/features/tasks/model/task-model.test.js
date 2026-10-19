import { describe, expect, it } from 'vitest';
import {
  calculateDailyPlannedMinutes,
  countTasksCompletedOnDate,
  createTask,
  createSubtaskSummaryMap,
  getTaskDescendantIds,
  normalizeTask,
  taskMatchesView,
  truncateTaskTitle,
} from './task-model.js';

describe('task model', () => {
  it('places a quick task from Today into today plan', () => {
    const task = createTask('Позвонить врачу', 'today', '2026-10-16');
    expect(task).toMatchObject({
      title: 'Позвонить врачу',
      status: 'planned',
      scheduledDate: '2026-10-16',
      estimate: 0,
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

  it('truncates a parent title only after 50 characters', () => {
    const exactTitle = 'а'.repeat(50);
    const longTitle = 'б'.repeat(51);

    expect(truncateTaskTitle(exactTitle)).toBe(exactTitle);
    expect(truncateTaskTitle(longTitle)).toBe(`${'б'.repeat(50)}…`);
  });

  it('includes active subtask estimates when the parent has no estimate', () => {
    const tasks = [
      { id: 'walk', status: 'planned', scheduledDate: '2026-10-16', estimate: 30 },
      { id: 'parent', status: 'completed', scheduledDate: '2026-10-16', estimate: 0 },
      { id: 'child-1', parentTaskId: 'parent', status: 'planned', scheduledDate: '2026-10-16', estimate: 20 },
      { id: 'child-2', parentTaskId: 'parent', status: 'planned', scheduledDate: '2026-10-16', estimate: 20 },
      { id: 'child-done', parentTaskId: 'parent', status: 'completed', scheduledDate: '2026-10-16', estimate: 15 },
    ];

    expect(calculateDailyPlannedMinutes(tasks, '2026-10-16')).toBe(70);
  });

  it('does not double-count a parent estimate and its decomposition', () => {
    const tasks = [
      { id: 'parent', status: 'planned', scheduledDate: '2026-10-16', estimate: 60 },
      { id: 'child-1', parentTaskId: 'parent', status: 'planned', scheduledDate: '2026-10-16', estimate: 20 },
      { id: 'child-2', parentTaskId: 'parent', status: 'planned', scheduledDate: '2026-10-16', estimate: 20 },
    ];

    expect(calculateDailyPlannedMinutes(tasks, '2026-10-16')).toBe(60);
  });

  it('summarizes time and urgency from active nested tasks', () => {
    const tasks = [
      { id: 'parent', status: 'planned', estimate: 0 },
      { id: 'child-1', parentTaskId: 'parent', status: 'planned', estimate: 60, isUrgent: true },
      { id: 'child-2', parentTaskId: 'parent', status: 'planned', estimate: 1200, importance: 'high' },
    ];

    expect(createSubtaskSummaryMap(tasks).get('parent')).toEqual({
      estimatedMinutes: 1260,
      isApproximate: false,
      hasUrgent: true,
      hasImportant: true,
    });
  });

  it('marks a subtask estimate as approximate when an active child is not estimated', () => {
    const tasks = [
      { id: 'parent', status: 'planned', estimate: 0 },
      { id: 'estimated', parentTaskId: 'parent', status: 'planned', estimate: 30 },
      { id: 'unknown', parentTaskId: 'parent', status: 'planned', estimate: 0 },
      { id: 'done', parentTaskId: 'parent', status: 'completed', estimate: 0, isUrgent: true },
    ];
    const summary = createSubtaskSummaryMap(tasks).get('parent');

    expect(summary.estimatedMinutes).toBe(30);
    expect(summary.isApproximate).toBe(true);
    expect(summary.hasUrgent).toBe(false);
  });

  it('keeps completed subtask estimates in the total scope of a parent task', () => {
    const tasks = [
      { id: 'parent', status: 'completed', estimate: 0 },
      { id: 'child-1', parentTaskId: 'parent', status: 'completed', estimate: 20 },
      { id: 'child-2', parentTaskId: 'parent', status: 'completed', estimate: 20 },
      { id: 'child-3', parentTaskId: 'parent', status: 'completed', estimate: 20 },
      { id: 'child-4', parentTaskId: 'parent', status: 'completed', estimate: 15 },
    ];
    const summary = createSubtaskSummaryMap(tasks).get('parent');

    expect(summary.estimatedMinutes).toBe(75);
    expect(summary.isApproximate).toBe(false);
  });

  it('finds every descendant so a task cannot be moved inside its own tree', () => {
    const tasks = [
      { id: 'parent' },
      { id: 'child', parentTaskId: 'parent' },
      { id: 'grandchild', parentTaskId: 'child' },
      { id: 'unrelated' },
    ];

    expect(Array.from(getTaskDescendantIds(tasks, 'parent')).sort()).toEqual(['child', 'grandchild']);
  });

  it('counts every task completed today including nested tasks', () => {
    const tasks = [
      { id: 'parent', status: 'planned', scheduledDate: '2026-10-17' },
      { id: 'child', parentTaskId: 'parent', status: 'completed', completed: true, completedAt: '2026-10-17T12:00:00.000Z' },
      { id: 'old', status: 'completed', completed: true, completedAt: '2026-10-16T12:00:00.000Z' },
    ];

    expect(countTasksCompletedOnDate(tasks, '2026-10-17')).toBe(1);
  });
});
