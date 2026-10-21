import { describe, expect, it } from 'vitest';
import {
  calendarItemOccursOn,
  describeCalendarItemSchedule,
  getCalendarEntries,
  getCalendarHabitItems,
  getCalendarMonthDays,
  importantDateOccursOn,
  normalizeCalendarItem,
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

  it('migrates legacy important dates without losing their yearly repeat', () => {
    expect(normalizeCalendarItem({ date: '2020-05-12', repeatsYearly: true })).toMatchObject({
      kind: 'important',
      startDate: '2020-05-12',
      recurrence: 'yearly',
    });
  });

  it('supports daily, weekly, monthly and interval recurrence inside date bounds', () => {
    const base = { startDate: '2026-10-05', endDate: '2026-11-30' };

    expect(calendarItemOccursOn({ ...base, recurrence: 'daily' }, '2026-10-06')).toBe(true);
    expect(calendarItemOccursOn({ ...base, recurrence: 'weekly' }, '2026-10-19')).toBe(true);
    expect(calendarItemOccursOn({ ...base, recurrence: 'weekly' }, '2026-10-20')).toBe(false);
    expect(calendarItemOccursOn({ ...base, recurrence: 'monthly' }, '2026-11-05')).toBe(true);
    expect(calendarItemOccursOn({ ...base, recurrence: 'interval', intervalDays: 3 }, '2026-10-14')).toBe(true);
    expect(calendarItemOccursOn({ ...base, recurrence: 'daily' }, '2026-12-01')).toBe(false);
  });

  it('supports selected weekdays and treats the end date as inclusive', () => {
    const item = {
      startDate: '2026-10-20',
      endDate: '2026-10-23',
      recurrence: 'weekdays',
      weekdays: [2, 5],
    };

    expect(calendarItemOccursOn(item, '2026-10-20')).toBe(true);
    expect(calendarItemOccursOn(item, '2026-10-22')).toBe(false);
    expect(calendarItemOccursOn(item, '2026-10-23')).toBe(true);
    expect(calendarItemOccursOn(item, '2026-10-30')).toBe(false);
  });

  it('does not shift monthly repeats to the last day of shorter months', () => {
    const item = { startDate: '2026-01-31', recurrence: 'monthly' };

    expect(calendarItemOccursOn(item, '2026-02-28')).toBe(false);
    expect(calendarItemOccursOn(item, '2026-03-31')).toBe(true);
  });

  it('describes custom recurrence compactly', () => {
    expect(describeCalendarItemSchedule({ recurrence: 'interval', intervalDays: 4 })).toBe('Каждые 4 дн.');
    expect(describeCalendarItemSchedule({ recurrence: 'weekdays', weekdays: [1, 3, 5] })).toBe('Пн, Ср, Пт');
  });

  it('combines calendar items, task plans, deadlines and project targets', () => {
    const entries = getCalendarEntries(
      [
        {
          id: 'planned',
          title: 'Встреча',
          status: 'planned',
          scheduledDate: '2026-10-19',
          isUrgent: true,
          importance: 'high',
        },
        { id: 'due', title: 'Отчёт', status: 'completed', completed: true, dueDate: '2026-10-19', importance: 'normal' },
      ],
      [{ id: 'project', title: 'Запуск', status: 'active', targetDate: '2026-10-19' }],
      [
        { id: 'date', title: 'Годовщина', startDate: '2026-10-19' },
        { id: 'reminder', kind: 'reminder', title: 'Оплатить счёт', startDate: '2026-10-19', time: '09:30' },
      ],
      '2026-10-19',
    );

    expect(entries.map((entry) => entry.type)).toEqual(['important', 'reminder', 'deadline', 'project', 'task']);
    expect(entries.find((entry) => entry.type === 'deadline')?.completed).toBe(true);
    expect(entries.find((entry) => entry.type === 'task')).toMatchObject({
      isUrgent: true,
      isImportant: true,
    });
    expect(entries.find((entry) => entry.type === 'deadline')).toMatchObject({
      isUrgent: false,
      isImportant: false,
    });
  });

  it('keeps future habit plans separate from missing past marks', () => {
    const habit = normalizeHabit({ id: 'read', title: 'Читать', scheduleDays: [1], createdAt: '2026-10-19T08:00:00.000Z' });

    expect(getCalendarHabitItems([habit], [], '2026-10-12', '2026-10-19')).toEqual([]);
    expect(getCalendarHabitItems([habit], [], '2026-10-19', '2026-10-18')[0].state).toBe('future');
    expect(getCalendarHabitItems([habit], [], '2026-10-19', '2026-10-19')[0].state).toBe('empty');
  });
});
