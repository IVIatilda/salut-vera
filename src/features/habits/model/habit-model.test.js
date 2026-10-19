import { describe, expect, it } from 'vitest';
import {
  canCompleteHabitTarget,
  createHabitLog,
  getHabitDaySummary,
  getLatestHabitEpisode,
  getHabitLogState,
  getHabitWeekProgress,
  getWeekDates,
  isHabitScheduledForDate,
  normalizeHabit,
} from './habit-model.js';

describe('habit model', () => {
  it('normalizes a new habit to a daily build habit', () => {
    const habit = normalizeHabit({ id: 'read', title: 'Читать' });
    expect(habit).toMatchObject({
      direction: 'build',
      trackingType: 'check',
      scheduleDays: [1, 2, 3, 4, 5, 6, 7],
      targetValue: 1,
      status: 'active',
    });
  });

  it('supports a schedule with selected weekdays', () => {
    const habit = normalizeHabit({ id: 'sport', scheduleDays: [1, 3, 5] });
    expect(isHabitScheduledForDate(habit, '2026-10-16')).toBe(true);
    expect(isHabitScheduledForDate(habit, '2026-10-17')).toBe(false);
  });

  it('builds a monday-first week', () => {
    expect(getWeekDates('2026-10-17')).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
    ]);
  });

  it('treats a quantitative habit as complete only after its target', () => {
    const habit = normalizeHabit({ id: 'water', trackingType: 'count', targetValue: 3 });
    expect(getHabitLogState(habit, { status: 'partial', value: 2 })).toBe('partial');
    expect(getHabitLogState(habit, { status: 'done', value: 3 })).toBe('done');
  });

  it('offers one-click completion only for quantitative build habits', () => {
    expect(canCompleteHabitTarget(normalizeHabit({ direction: 'build', trackingType: 'duration' }))).toBe(true);
    expect(canCompleteHabitTarget(normalizeHabit({ direction: 'build', trackingType: 'count' }))).toBe(true);
    expect(canCompleteHabitTarget(normalizeHabit({ direction: 'build', trackingType: 'check' }))).toBe(false);
    expect(canCompleteHabitTarget(normalizeHabit({ direction: 'reduce', trackingType: 'count' }))).toBe(false);
  });

  it('counts only scheduled elapsed days in weekly regularity', () => {
    const habit = normalizeHabit({ id: 'sport', scheduleDays: [1, 3, 5] });
    const logs = [
      { habitId: 'sport', occurredOn: '2026-10-12', status: 'done', value: 1 },
      { habitId: 'sport', occurredOn: '2026-10-14', status: 'done', value: 1 },
    ];
    expect(getHabitWeekProgress(habit, logs, getWeekDates('2026-10-17'), '2026-10-17')).toEqual({
      completed: 2,
      planned: 3,
    });
  });

  it('records an unwanted-habit episode without calling it completion', () => {
    const habit = normalizeHabit({ id: 'phone', direction: 'reduce' });
    expect(getHabitLogState(habit, { status: 'episode', value: 1 })).toBe('episode');
    expect(getHabitLogState(habit, { status: 'done', value: 0 })).toBe('done');
  });

  it('stores every unwanted-habit episode as a timestamped event', () => {
    const occurredAt = '2026-10-17T09:42:13.000Z';
    const first = createHabitLog('phone', '2026-10-17', 'episode', 1, occurredAt);
    const second = createHabitLog('phone', '2026-10-17', 'episode', 1, occurredAt);

    expect(first).toMatchObject({
      habitId: 'phone',
      occurredOn: '2026-10-17',
      occurredAt,
      status: 'episode',
      value: 1,
    });
    expect(first.id).not.toBe(second.id);
  });

  it('derives a daily episode count without losing individual events', () => {
    const habit = normalizeHabit({ id: 'phone', direction: 'reduce' });
    const logs = [
      { id: 'one', habitId: 'phone', occurredOn: '2026-10-17', occurredAt: '2026-10-17T09:00:00.000Z', status: 'episode', value: 1 },
      { id: 'two', habitId: 'phone', occurredOn: '2026-10-17', occurredAt: '2026-10-17T12:00:00.000Z', status: 'episode', value: 1 },
    ];

    expect(getHabitDaySummary(habit, logs)).toEqual({ state: 'episode', value: 2 });
    expect(getLatestHabitEpisode(logs, 'phone', '2026-10-17')?.id).toBe('two');
  });
});
