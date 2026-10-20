import { useMemo } from 'react';
import {
  getHabitDaySummary,
  getScheduledHabitsForDate,
} from '../model/habit-model.js';

const MAX_VISIBLE_HABITS = 4;

function formatProgress(habit, value) {
  if (habit.trackingType === 'duration') return `${value} из ${habit.targetValue} мин`;
  return `${value} из ${habit.targetValue}`;
}

function actionLabel(habit, summary) {
  if (summary.state === 'done') return 'Убрать отметку';
  return habit.trackingType === 'check' ? 'Отметить' : 'Выполнить план';
}

export default function TodayHabitList({
  habits,
  logs,
  roles,
  today,
  isLoading,
  onOpen,
  onLogChange,
  onOpenAll,
}) {
  const logsByHabit = useMemo(() => {
    const grouped = new Map();
    logs.forEach((log) => {
      if (log.occurredOn !== today) return;
      grouped.set(log.habitId, [...(grouped.get(log.habitId) || []), log]);
    });
    return grouped;
  }, [logs, today]);
  const scheduledHabits = getScheduledHabitsForDate(habits, today);
  const habitItems = scheduledHabits.map((habit) => ({
    habit,
    summary: getHabitDaySummary(habit, logsByHabit.get(habit.id)),
  }));
  const completedCount = habitItems.filter(({ summary }) => summary.state === 'done').length;
  const visibleItems = [...habitItems]
    .sort((first, second) => Number(first.summary.state === 'done') - Number(second.summary.state === 'done'))
    .slice(0, MAX_VISIBLE_HABITS);
  const hiddenCount = Math.max(0, habitItems.length - visibleItems.length);

  return (
    <section className="today-habits-card" aria-labelledby="today-habits-title">
      <div className="today-habits-heading">
        <div>
          <h2 id="today-habits-title">Привычки</h2>
        </div>
        {!isLoading && scheduledHabits.length > 0 && (
          <strong aria-label={`Отмечено ${completedCount} из ${scheduledHabits.length}`}>
            {completedCount}<i>/</i>{scheduledHabits.length}
          </strong>
        )}
      </div>

      {isLoading ? (
        <p className="today-habits-message">Загружаем привычки…</p>
      ) : scheduledHabits.length === 0 ? (
        <div className="today-habits-empty">
          <p>На сегодня ничего не запланировано.</p>
          <button onClick={onOpenAll} type="button">Открыть привычки →</button>
        </div>
      ) : (
        <>
          <div className="today-habit-list">
            {visibleItems.map(({ habit, summary }) => {
              const role = roles.find((item) => item.id === habit.roleId);
              const isDone = summary.state === 'done';
              const isEpisode = summary.state === 'episode';
              const supportingText = habit.direction === 'reduce'
                ? isEpisode ? `${summary.value} эп. сегодня` : isDone ? 'Без эпизодов' : 'День пока не отмечен'
                : habit.trackingType === 'check'
                  ? habit.twoMinuteVersion || habit.identityStatement
                  : formatProgress(habit, summary.value);

              return (
                <article className={`today-habit-row ${habit.direction} ${isDone ? 'done' : ''}`} key={habit.id}>
                  <span className="today-habit-marker" aria-hidden="true" />
                  <button className="today-habit-copy" onClick={() => onOpen(habit)} type="button">
                    <strong>{habit.title}</strong>
                    {(supportingText || role) && (
                      <span>
                        {supportingText}
                        {role && <i style={{ '--role-color': role.color }}>{role.title}</i>}
                      </span>
                    )}
                  </button>
                  {habit.direction === 'reduce' ? (
                    <div className="today-habit-reduce-actions">
                      {!isEpisode && (
                        <button
                          className={`today-habit-action ${isDone ? 'done' : ''}`}
                          onClick={() => onLogChange(habit, isDone ? 'clear' : 'done')}
                          type="button"
                          aria-label={`${isDone ? 'Убрать отметку без эпизодов' : 'Отметить день без эпизодов'}: ${habit.title}`}
                          title={isDone ? 'Убрать отметку «Без эпизодов»' : 'Отметить «Без эпизодов»'}
                        >
                          ✓
                        </button>
                      )}
                      <button
                        className="today-habit-action episode"
                        onClick={() => onLogChange(habit, 'episode')}
                        type="button"
                        aria-label={`Отметить эпизод: ${habit.title}`}
                        title="Отметить эпизод"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      className={`today-habit-action ${isDone ? 'done' : ''}`}
                      onClick={() => onLogChange(habit, isDone ? 'clear' : 'done')}
                      type="button"
                      aria-label={`${actionLabel(habit, summary)}: ${habit.title}`}
                      title={actionLabel(habit, summary)}
                    >
                      ✓
                    </button>
                  )}
                </article>
              );
            })}
          </div>
          <button className="today-habits-open" onClick={onOpenAll} type="button">
            {hiddenCount > 0 ? `Ещё ${hiddenCount} · Все привычки →` : 'Все привычки →'}
          </button>
        </>
      )}
    </section>
  );
}
