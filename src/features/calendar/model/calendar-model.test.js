import { describe, expect, it } from 'vitest';
import {
  getCalendarEntries,
  getCalendarHabitItems,
  getCalendarMonthDays,
  importantDateOccursOn,
  normalizeImportantDate,
} from './calendar-model.js';
import { normalizeHabit } from '../../habits/model/habit-model.js';

describe('calendar model', () => {
  it('builds a six-week monday-first month grid with adjacent dates', () => {
    const days = getCalendarMonthDays('2026-10-19');

    expect(days).toHaveLength(42);
    expect(days[0]).toMatchObject({ dateKey: '2026-09-28', isCurrentMonth: false });
    expect(days[3]).toMatchObject({ dateKey: '2026-10-01', isCurrentMonth: true });
    expect(days.at(-1)).toMatchObject({ dateKey: '2026-11-08', isCurrentMonth: false });
  });

  it('supports fixed and yearly important dates', () => {
    const fixed = normalizeImportantDate({ date: '2026-10-05' });
    const yearly = normalizeImportantDate({ date: '2020-10-05', repeatsYearly: true });

    expect(importantDateOccursOn(fixed, '2026-10-05')).toBe(true);
    expect(importantDateOccursOn(fixed, '2027-10-05')).toBe(false);
    expect(importantDateOccursOn(yearly, '2027-10-05')).toBe(true);
  });

  it('combines important dates, task plans, deadlines and project targets', () => {
    const entries = getCalendarEntries(
      [
        { id: 'planned', title: 'Встреча', status: 'planned', scheduledDate: '2026-10-19' },
        { id: 'due', title: 'Отчёт', status: 'completed', completed: true, dueDate: '2026-10-19' },
      ],
      [{ id: 'project', title: 'Запуск', status: 'active', targetDate: '2026-10-19' }],
      [{ id: 'date', title: 'Годовщина', date: '2026-10-19' }],
      '2026-10-19',
    );

    expect(entries.map((entry) => entry.type)).toEqual(['important', 'deadline', 'project', 'task']);
    expect(entries.find((entry) => entry.type === 'deadline')?.completed).toBe(true);
  });

  it('keeps future habit plans separate from missing past marks', () => {
    const habit = normalizeHabit({ id: 'read', title: 'Читать', scheduleDays: [1], createdAt: '2026-10-19T08:00:00.000Z' });

    expect(getCalendarHabitItems([habit], [], '2026-10-12', '2026-10-19')).toEqual([]);
    expect(getCalendarHabitItems([habit], [], '2026-10-19', '2026-10-18')[0].state).toBe('future');
    expect(getCalendarHabitItems([habit], [], '2026-10-19', '2026-10-19')[0].state).toBe('empty');
  });
});
