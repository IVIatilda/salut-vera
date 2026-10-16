import { describe, expect, it } from 'vitest';
import {
  createTimerState,
  formatCountdown,
  getElapsedSeconds,
  getPhaseSeconds,
  getRemainingSeconds,
  moveToNextPhase,
  resetCurrentPhase,
} from './pomodoro.js';

describe('pomodoro timer calculations', () => {
  it('creates the classic 25 minute focus session by default', () => {
    expect(createTimerState()).toMatchObject({
      presetId: 'classic',
      focusMinutes: 25,
      breakMinutes: 5,
      mode: 'focus',
      status: 'idle',
      remainingSeconds: 25 * 60,
    });
  });

  it('formats a countdown with leading zeroes', () => {
    expect(formatCountdown(65)).toBe('01:05');
    expect(formatCountdown(0)).toBe('00:00');
  });

  it('calculates remaining time from an absolute deadline', () => {
    expect(getRemainingSeconds(31_000, 1_000)).toBe(30);
    expect(getRemainingSeconds(1_000, 2_000)).toBe(0);
  });

  it('switches a completed focus session to its configured break', () => {
    const next = moveToNextPhase(createTimerState('deep'));
    expect(next.mode).toBe('break');
    expect(next.remainingSeconds).toBe(getPhaseSeconds(next, 'break'));
    expect(next.status).toBe('idle');
  });

  it('skips an idle break and returns to a full focus interval', () => {
    const breakTimer = moveToNextPhase(createTimerState('classic'));
    const next = moveToNextPhase(breakTimer);
    expect(next.mode).toBe('focus');
    expect(next.status).toBe('idle');
    expect(next.remainingSeconds).toBe(25 * 60);
  });

  it('supports custom work and break duration', () => {
    const timer = createTimerState('custom', { focusMinutes: 35, breakMinutes: 7 });
    expect(timer.presetId).toBe('custom');
    expect(timer.remainingSeconds).toBe(35 * 60);
    expect(getPhaseSeconds(timer, 'break')).toBe(7 * 60);
  });

  it('counts only elapsed time when a session is completed early', () => {
    const timer = {
      ...createTimerState(),
      status: 'paused',
      remainingSeconds: 20 * 60,
    };
    expect(getElapsedSeconds(timer)).toBe(5 * 60);
  });

  it('cancels a phase without changing its mode or settings', () => {
    const timer = {
      ...createTimerState('deep'),
      status: 'paused',
      remainingSeconds: 12,
    };
    expect(resetCurrentPhase(timer)).toMatchObject({
      mode: 'focus',
      status: 'idle',
      remainingSeconds: 50 * 60,
    });
  });
});
