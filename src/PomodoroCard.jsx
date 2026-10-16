import { useEffect, useRef, useState } from 'react';
import CustomSelect from './CustomSelect.jsx';
import {
  POMODORO_PRESETS,
  createTimerState,
  formatCountdown,
  getElapsedSeconds,
  getPhaseSeconds,
  getRemainingSeconds,
  moveToNextPhase,
  resetCurrentPhase,
} from './pomodoro.js';

const STORAGE_KEY = 'vera-pomodoro-state-v1';

function loadTimerState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!stored) return createTimerState();

    const preset = POMODORO_PRESETS[stored.presetId] || POMODORO_PRESETS.classic;
    const migrated = {
      ...createTimerState(stored.presetId, {
        focusMinutes: stored.focusMinutes || preset.focusMinutes,
        breakMinutes: stored.breakMinutes || preset.breakMinutes,
      }),
      ...stored,
      focusMinutes: stored.focusMinutes || preset.focusMinutes,
      breakMinutes: stored.breakMinutes || preset.breakMinutes,
    };

    if (migrated.status === 'running') {
      return { ...migrated, remainingSeconds: getRemainingSeconds(migrated.endAt) };
    }
    return migrated;
  } catch {
    return createTimerState();
  }
}

function GearIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm7.4 5.4 1.1 1.7-2 3.4-2-.1a8 8 0 0 1-2.1 1.2l-.9 1.8h-4l-.9-1.8a8 8 0 0 1-2.1-1.2l-2 .1-2-3.4 1.1-1.7a8 8 0 0 1 0-2.5l-1.1-1.7 2-3.4 2 .1a8 8 0 0 1 2.1-1.2l.9-1.8h4l.9 1.8a8 8 0 0 1 2.1 1.2l2-.1 2 3.4-1.1 1.7a8 8 0 0 1 0 2.5z" />
    </svg>
  );
}

function ControlIcon({ name }) {
  if (name === 'play') {
    return (
      <svg className="control-icon filled" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7.5 5.2v13.6L19 12 7.5 5.2z" />
      </svg>
    );
  }
  if (name === 'pause') {
    return (
      <svg className="control-icon filled" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 5h4v14H7zm6 0h4v14h-4z" />
      </svg>
    );
  }
  if (name === 'stop') {
    return (
      <svg className="control-icon filled" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="6" y="6" width="12" height="12" rx="1.5" />
      </svg>
    );
  }
  if (name === 'skip') {
    return (
      <svg className="control-icon filled" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5.5 5.5v13L15 12 5.5 5.5zm10 0H19v13h-3.5z" />
      </svg>
    );
  }
  return (
    <svg className="control-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="m6.4 6.4 11.2 11.2" />
    </svg>
  );
}

export default function PomodoroCard({ tasks, onFocusComplete }) {
  const [timer, setTimer] = useState(loadTimerState);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState({
    presetId: timer.presetId,
    focusMinutes: String(timer.focusMinutes),
    breakMinutes: String(timer.breakMinutes),
  });
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const finishingRef = useRef(false);
  const availableTasks = tasks.filter((task) => !task.completed && task.status !== 'cancelled');
  const selectedTask = tasks.find((task) => task.id === timer.taskId);
  const taskOptions = [
    { value: '', label: 'Без задачи' },
    ...availableTasks.map((task) => ({ value: task.id, label: task.title })),
  ];
  if (selectedTask?.completed && !taskOptions.some((option) => option.value === selectedTask.id)) {
    taskOptions.push({ value: selectedTask.id, label: selectedTask.title });
  }
  const isActive = timer.status === 'running' || timer.status === 'paused';
  const elapsedSeconds = getElapsedSeconds(timer);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(timer));
    } catch {
      // The timer still works in memory when browser storage is unavailable.
    }
  }, [timer]);

  useEffect(() => {
    if (timer.taskId || availableTasks.length === 0 || isActive) return;
    setTimer((current) => ({ ...current, taskId: availableTasks[0].id }));
  }, [availableTasks, isActive, timer.taskId]);

  useEffect(() => {
    if (!isSettingsOpen) return undefined;
    function closeOnEscape(event) {
      if (event.key === 'Escape') setIsSettingsOpen(false);
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isSettingsOpen]);

  useEffect(() => {
    if (timer.status !== 'running') return undefined;

    async function tick() {
      const remainingSeconds = getRemainingSeconds(timer.endAt);
      if (remainingSeconds > 0) {
        setTimer((current) => (
          current.remainingSeconds === remainingSeconds ? current : { ...current, remainingSeconds }
        ));
        return;
      }
      if (finishingRef.current) return;

      finishingRef.current = true;
      setIsSaving(true);
      setSaveError('');
      try {
        if (timer.mode === 'focus' && timer.taskId) {
          await onFocusComplete({
            taskId: timer.taskId,
            durationSeconds: getPhaseSeconds(timer, 'focus'),
            startedAt: timer.startedAt,
            endedAt: new Date().toISOString(),
          });
        }
        setTimer((current) => moveToNextPhase(current));
      } catch {
        setSaveError('Не удалось сохранить время. Повторите завершение сессии.');
        setTimer((current) => ({ ...current, status: 'paused', remainingSeconds: 0, endAt: null }));
      } finally {
        finishingRef.current = false;
        setIsSaving(false);
      }
    }

    tick();
    const intervalId = window.setInterval(tick, 250);
    return () => window.clearInterval(intervalId);
  }, [onFocusComplete, timer.breakMinutes, timer.endAt, timer.focusMinutes, timer.mode, timer.startedAt, timer.status, timer.taskId]);

  useEffect(() => {
    if (timer.status === 'running') {
      document.title = `${formatCountdown(timer.remainingSeconds)} — ${timer.mode === 'focus' ? 'Фокус' : 'Перерыв'}`;
      return;
    }
    document.title = 'Вера — мой день';
  }, [timer.mode, timer.remainingSeconds, timer.status]);

  function startTimer() {
    if (timer.mode === 'focus' && !timer.taskId) return;
    setSaveError('');
    setTimer((current) => ({
      ...current,
      status: 'running',
      startedAt: current.startedAt || new Date().toISOString(),
      endAt: Date.now() + current.remainingSeconds * 1000,
    }));
  }

  function pauseTimer() {
    setTimer((current) => ({
      ...current,
      status: 'paused',
      remainingSeconds: getRemainingSeconds(current.endAt),
      endAt: null,
    }));
  }

  function toggleTimer() {
    if (timer.status === 'running') pauseTimer();
    else startTimer();
  }

  async function finishCurrentPhase() {
    if (!isActive || finishingRef.current) return;
    const remainingSeconds = timer.status === 'running'
      ? getRemainingSeconds(timer.endAt)
      : timer.remainingSeconds;
    const spentSeconds = Math.max(0, getPhaseSeconds(timer) - remainingSeconds);

    finishingRef.current = true;
    setIsSaving(true);
    setSaveError('');
    try {
      if (timer.mode === 'focus' && timer.taskId && spentSeconds > 0) {
        await onFocusComplete({
          taskId: timer.taskId,
          durationSeconds: spentSeconds,
          startedAt: timer.startedAt,
          endedAt: new Date().toISOString(),
        });
      }
      setTimer((current) => moveToNextPhase(current));
    } catch {
      setSaveError('Не удалось сохранить время. Попробуйте ещё раз.');
      if (timer.status === 'running') pauseTimer();
    } finally {
      finishingRef.current = false;
      setIsSaving(false);
    }
  }

  function cancelCurrentPhase() {
    if (!isActive || isSaving) return;
    setSaveError('');
    setTimer((current) => resetCurrentPhase(current));
  }

  function skipBreak() {
    if (timer.mode !== 'break' || isActive || isSaving) return;
    setSaveError('');
    setTimer((current) => moveToNextPhase(current));
  }

  function openSettings() {
    setSettingsDraft({
      presetId: timer.presetId,
      focusMinutes: String(timer.focusMinutes),
      breakMinutes: String(timer.breakMinutes),
    });
    setIsSettingsOpen(true);
  }

  function choosePreset(preset) {
    setSettingsDraft({
      presetId: preset.id,
      focusMinutes: String(preset.focusMinutes),
      breakMinutes: String(preset.breakMinutes),
    });
  }

  function changeManualSetting(field, value) {
    setSettingsDraft((current) => ({ ...current, presetId: 'custom', [field]: value }));
  }

  function applySettings(event) {
    event.preventDefault();
    const focusMinutes = Number(settingsDraft.focusMinutes);
    const breakMinutes = Number(settingsDraft.breakMinutes);
    if (focusMinutes < 1 || focusMinutes > 180 || breakMinutes < 1 || breakMinutes > 60) return;

    setTimer((current) => ({
      ...createTimerState(settingsDraft.presetId, { focusMinutes, breakMinutes }),
      taskId: current.taskId,
    }));
    setIsSettingsOpen(false);
  }

  const primaryLabel = timer.status === 'running'
    ? 'Пауза'
    : timer.status === 'paused'
      ? 'Продолжить'
      : 'Старт';
  const settingsAreValid = Number(settingsDraft.focusMinutes) >= 1
    && Number(settingsDraft.focusMinutes) <= 180
    && Number(settingsDraft.breakMinutes) >= 1
    && Number(settingsDraft.breakMinutes) <= 60;

  return (
    <>
      <section className={`focus-card ${timer.mode === 'break' ? 'break-mode' : ''}`}>
        <div className="focus-card-heading">
          <span className="eyebrow light">{timer.mode === 'focus' ? 'Фокус' : 'Перерыв'}</span>
          <button
            className="focus-settings-button"
            disabled={isActive}
            onClick={openSettings}
            title={isActive ? 'Сначала завершите или отмените текущий интервал' : 'Настроить интервалы'}
            type="button"
            aria-label="Настроить время работы и отдыха"
          >
            <GearIcon />
          </button>
        </div>

        <div className="focus-time" role="timer" aria-live="off">{formatCountdown(timer.remainingSeconds)}</div>

        <div className="focus-task-slot">
          {timer.mode === 'focus' && (
            <>
              <span className="focus-task-label">Задача</span>
              <CustomSelect
                value={timer.taskId}
                options={taskOptions}
                onChange={(value) => setTimer((current) => ({ ...current, taskId: value }))}
                ariaLabel="Задача"
                disabled={isActive}
                className="focus-task-select"
              />
            </>
          )}
        </div>

        <div className={`focus-actions ${timer.mode === 'break' ? 'break-actions' : ''}`}>
          <button
            className="focus-primary"
            disabled={isSaving || (timer.mode === 'focus' && !timer.taskId)}
            onClick={toggleTimer}
            title={primaryLabel}
            type="button"
            aria-label={primaryLabel}
          >
            <ControlIcon name={timer.status === 'running' ? 'pause' : 'play'} />
          </button>
          {timer.mode === 'break' ? (
            <button
              className="focus-complete"
              disabled={isSaving}
              onClick={isActive ? finishCurrentPhase : skipBreak}
              title={isActive ? 'Завершить' : 'Пропустить'}
              type="button"
              aria-label={isActive ? 'Завершить перерыв' : 'Пропустить перерыв'}
            >
              <ControlIcon name={isActive ? 'stop' : 'skip'} />
            </button>
          ) : (
            <>
              <button
                className="focus-complete"
                disabled={!isActive || elapsedSeconds === 0 || isSaving}
                onClick={finishCurrentPhase}
                title="Завершить"
                type="button"
                aria-label="Завершить фокус и записать затраченное время"
              >
                <ControlIcon name="stop" />
              </button>
              <button
                className="focus-cancel"
                disabled={!isActive || isSaving}
                onClick={cancelCurrentPhase}
                title="Отмена"
                type="button"
                aria-label="Отменить фокус без записи времени"
              >
                <ControlIcon name="cancel" />
              </button>
            </>
          )}
        </div>
        {saveError && <p className="focus-error" role="alert">{saveError}</p>}
      </section>

      {isSettingsOpen && (
        <div
          className="timer-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsSettingsOpen(false);
          }}
        >
          <section className="timer-modal" role="dialog" aria-modal="true" aria-labelledby="timer-settings-title">
            <div className="timer-modal-heading">
              <div>
                <span className="eyebrow">Pomodoro</span>
                <h2 id="timer-settings-title">Время работы и отдыха</h2>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} type="button" aria-label="Закрыть настройки">×</button>
            </div>

            <form onSubmit={applySettings}>
              <fieldset className="timer-presets">
                <legend>Готовые варианты</legend>
                {Object.values(POMODORO_PRESETS).map((preset) => (
                  <button
                    className={settingsDraft.presetId === preset.id ? 'active' : ''}
                    key={preset.id}
                    onClick={() => choosePreset(preset)}
                    type="button"
                  >
                    <strong>{preset.label}</strong>
                    <span>{preset.focusMinutes} мин · {preset.breakMinutes} мин</span>
                  </button>
                ))}
              </fieldset>

              <fieldset className="timer-manual-settings">
                <legend>Или настройте вручную</legend>
                <label>
                  <span>Работа, минут</span>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={settingsDraft.focusMinutes}
                    onChange={(event) => changeManualSetting('focusMinutes', event.target.value)}
                  />
                </label>
                <label>
                  <span>Отдых, минут</span>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={settingsDraft.breakMinutes}
                    onChange={(event) => changeManualSetting('breakMinutes', event.target.value)}
                  />
                </label>
              </fieldset>

              <div className="timer-modal-actions">
                <button className="modal-cancel" onClick={() => setIsSettingsOpen(false)} type="button">Отмена</button>
                <button className="modal-save" disabled={!settingsAreValid} type="submit">Сохранить</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
