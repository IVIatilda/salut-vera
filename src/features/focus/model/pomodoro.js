export const POMODORO_PRESETS = {
  classic: { id: 'classic', label: 'Классический', focusMinutes: 25, breakMinutes: 5 },
  deep: { id: 'deep', label: 'Глубокий фокус', focusMinutes: 50, breakMinutes: 10 },
  balanced: { id: 'balanced', label: 'Сбалансированный', focusMinutes: 45, breakMinutes: 15 },
  long: { id: 'long', label: 'Длинный', focusMinutes: 90, breakMinutes: 20 },
};

export function createTimerState(presetId = 'classic', customSettings = {}) {
  const preset = POMODORO_PRESETS[presetId] || POMODORO_PRESETS.classic;
  const focusMinutes = customSettings.focusMinutes || preset.focusMinutes;
  const breakMinutes = customSettings.breakMinutes || preset.breakMinutes;

  return {
    presetId: POMODORO_PRESETS[presetId] ? preset.id : 'custom',
    focusMinutes,
    breakMinutes,
    mode: 'focus',
    status: 'idle',
    remainingSeconds: focusMinutes * 60,
    endAt: null,
    startedAt: null,
    taskId: '',
  };
}

export function getPhaseSeconds(timer, mode = timer.mode) {
  return (mode === 'focus' ? timer.focusMinutes : timer.breakMinutes) * 60;
}

export function getRemainingSeconds(endAt, now = Date.now()) {
  if (!endAt) return 0;
  return Math.max(0, Math.ceil((endAt - now) / 1000));
}

export function getElapsedSeconds(timer, now = Date.now()) {
  const remainingSeconds = timer.status === 'running'
    ? getRemainingSeconds(timer.endAt, now)
    : timer.remainingSeconds;
  return Math.max(0, getPhaseSeconds(timer) - remainingSeconds);
}

export function formatCountdown(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function moveToNextPhase(timer) {
  const mode = timer.mode === 'focus' ? 'break' : 'focus';
  return {
    ...timer,
    mode,
    status: 'idle',
    remainingSeconds: getPhaseSeconds(timer, mode),
    endAt: null,
    startedAt: null,
  };
}

export function resetCurrentPhase(timer) {
  return {
    ...timer,
    status: 'idle',
    remainingSeconds: getPhaseSeconds(timer),
    endAt: null,
    startedAt: null,
  };
}
