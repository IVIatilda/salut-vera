import { describe, expect, it } from 'vitest';
import {
  buildDailyPriorities,
  createMorningRitual,
  getDailyPriorityIds,
  normalizeRitualSession,
  toggleDailyPriority,
} from './ritual-model.js';

describe('morning ritual model', () => {
  it('creates one stable morning session per local day', () => {
    expect(createMorningRitual('2026-10-20', '2026-10-20T07:00:00.000Z')).toMatchObject({
      id: 'morning:2026-10-20',
      type: 'morning',
      sessionDate: '2026-10-20',
      status: 'started',
      currentStep: 1,
      energyRating: null,
      moodRating: null,
    });
  });

  it('keeps ratings and steps inside supported bounds', () => {
    expect(normalizeRitualSession({ sessionDate: '2026-10-20', currentStep: 8, energyRating: 0, moodRating: 4 })).toMatchObject({
      currentStep: 3,
      energyRating: null,
      moodRating: 4,
    });
  });

  it('selects no more than three daily priorities and preserves their order', () => {
    let selected = ['one', 'two', 'three'];
    selected = toggleDailyPriority(selected, 'four');
    expect(selected).toEqual(['one', 'two', 'three']);

    selected = toggleDailyPriority(selected, 'two');
    selected = toggleDailyPriority(selected, 'four');
    expect(selected).toEqual(['one', 'three', 'four']);

    const priorities = buildDailyPriorities('2026-10-20', selected);
    expect(getDailyPriorityIds(priorities, '2026-10-20')).toEqual(['one', 'three', 'four']);
    expect(priorities.map((item) => item.sortOrder)).toEqual([1, 2, 3]);
  });
});
