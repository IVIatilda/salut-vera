import { describe, expect, it } from 'vitest';
import { getFocusTaskOptions, isFocusTaskOverdue } from './focus-task-options.js';

const TODAY = '2026-10-20';

function task(id, dates = {}) {
  return {
    id,
    title: `Задача ${id}`,
    status: 'planned',
    completed: false,
    scheduledDate: '',
    dueDate: '',
    ...dates,
  };
}

describe('focus task options', () => {
  it('shows tasks planned for today before overdue tasks', () => {
    const options = getFocusTaskOptions([
      task('overdue-due', { dueDate: '2026-10-19' }),
      task('today-first', { scheduledDate: TODAY }),
      task('today-with-overdue-deadline', { scheduledDate: TODAY, dueDate: '2026-10-19' }),
      task('overdue-plan', { scheduledDate: '2026-10-18' }),
      task('today-second', { scheduledDate: TODAY }),
    ], TODAY);

    expect(options).toEqual([
      { value: 'today-first', label: 'Задача today-first', overdue: false },
      { value: 'today-second', label: 'Задача today-second', overdue: false },
      { value: 'overdue-due', label: 'Задача overdue-due', overdue: true },
      { value: 'today-with-overdue-deadline', label: 'Задача today-with-overdue-deadline', overdue: true },
      { value: 'overdue-plan', label: 'Задача overdue-plan', overdue: true },
    ]);
  });

  it('hides future, undated, completed and cancelled tasks', () => {
    const options = getFocusTaskOptions([
      task('tomorrow', { scheduledDate: '2026-10-21' }),
      task('later', { scheduledDate: '2026-11-02' }),
      task('undated'),
      task('completed', { scheduledDate: TODAY, status: 'completed', completed: true }),
      task('cancelled', { scheduledDate: TODAY, status: 'cancelled' }),
      task('today', { scheduledDate: TODAY }),
    ], TODAY);

    expect(options.map((option) => option.value)).toEqual(['today']);
  });

  it('does not surface a future-planned task even when its deadline is past', () => {
    const options = getFocusTaskOptions([
      task('inconsistent-dates', { scheduledDate: '2026-10-21', dueDate: '2026-10-19' }),
    ], TODAY);

    expect(options).toEqual([]);
  });

  it('treats a missed planned date and a missed deadline as overdue', () => {
    expect(isFocusTaskOverdue(task('planned', { scheduledDate: '2026-10-19' }), TODAY)).toBe(true);
    expect(isFocusTaskOverdue(task('deadline', { dueDate: '2026-10-19' }), TODAY)).toBe(true);
    expect(isFocusTaskOverdue(task('today', { scheduledDate: TODAY, dueDate: TODAY }), TODAY)).toBe(false);
  });
});
