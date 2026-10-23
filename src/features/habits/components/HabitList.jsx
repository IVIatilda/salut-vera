import { useMemo, useState } from 'react';
import {
  WEEKDAYS,
  canCompleteHabitTarget,
  getHabitDaySummary,
  getHabitWeekProgress,
  getWeekDates,
  isHabitScheduledForDate,
} from '../model/habit-model.js';

const FILTERS = [
  ['active', 'Активные'],
  ['build', 'Развиваю'],
  ['reduce', 'Ослабляю'],
  ['archived', 'В архиве'],
];

function scheduleLabel(habit) {
  if (habit.scheduleDays.length === 7) return 'Каждый день';
  if (habit.scheduleDays.join(',') === '1,2,3,4,5') return 'По будням';
  if (habit.scheduleDays.join(',') === '6,7') return 'По выходным';
  return habit.scheduleDays
    .map((day) => WEEKDAYS.find((item) => item.value === day)?.short)
    .filter(Boolean)
    .join(', ');
}

function formatValue(habit, value) {
  if (habit.trackingType === 'duration') return `${value} мин`;
  return `${value} / ${habit.targetValue}`;
}

function formatTarget(habit) {
  if (habit.trackingType === 'duration') return `${habit.targetValue} мин`;
  return `${habit.targetValue} ${habit.targetUnit || 'раз'}`;
}

export default function HabitList({ habits, logs, roles, today, isLoading, onOpen, onLogChange }) {
  const [filter, setFilter] = useState('active');
  const weekDates = useMemo(() => getWeekDates(today), [today]);
  const logsByHabitAndDate = useMemo(
    () => {
      const grouped = new Map();
      logs.forEach((log) => {
        const key = `${log.habitId}:${log.occurredOn}`;
        grouped.set(key, [...(grouped.get(key) || []), log]);
      });
      return grouped;
    },
    [logs],
  );
  const visibleHabits = habits.filter((habit) => {
    if (filter === 'archived') return habit.status === 'archived';
    if (habit.status !== 'active') return false;
    if (filter === 'build' || filter === 'reduce') return habit.direction === filter;
    return true;
  });
  const todayHabits = habits.filter((habit) => isHabitScheduledForDate(habit, today));
  const completedToday = todayHabits.filter((habit) => (
    getHabitDaySummary(habit, logsByHabitAndDate.get(`${habit.id}:${today}`)).state === 'done'
  )).length;

  return (
    <section className="habits-panel">

      <div className="task-filters" aria-label="Фильтры привычек">
        {FILTERS.map(([id, label]) => (
          <button className={filter === id ? 'active' : ''} key={id} onClick={() => setFilter(id)} type="button">
            {label}
          </button>
        ))}
      </div>

      {isLoading && <p className="empty-message">Загружаем привычки…</p>}
      {!isLoading && visibleHabits.length === 0 && (
        <div className="projects-empty habit-empty">
          <strong>{filter === 'active' ? 'Активных привычек пока нет' : 'В этой подборке ничего нет'}</strong>
          <span>Начните с действия, которое можно выполнить даже в сложный день.</span>
        </div>
      )}

      <div className="habit-grid">
        {visibleHabits.map((habit) => {
          const role = roles.find((item) => item.id === habit.roleId);
          const todaySummary = getHabitDaySummary(habit, logsByHabitAndDate.get(`${habit.id}:${today}`));
          const todayState = todaySummary.state;
          const progress = getHabitWeekProgress(habit, logs, weekDates, today);
          const currentValue = todaySummary.value;
          const step = habit.trackingType === 'duration' ? 5 : 1;

          return (
            <article className={`habit-card ${habit.direction}`} key={habit.id}>
              <div className="habit-card-topline">
                <span className={`habit-direction ${habit.direction}`}>
                  {habit.direction === 'build' ? 'Развиваю' : 'Ослабляю'}
                </span>
                <span>{scheduleLabel(habit)}</span>
              </div>

              <button className="habit-card-title" onClick={() => onOpen(habit)} type="button">
                <strong>{habit.title}</strong>
                {habit.status === 'archived' && <i>В архиве</i>}
              </button>

              <p className="habit-identity">
                {habit.identityStatement || habit.twoMinuteVersion || 'Добавьте идентичность или минимальную версию действия'}
              </p>

              <div className="habit-week" aria-label={`Регулярность за неделю: ${progress.completed} из ${progress.planned}`}>
                {weekDates.map((date, index) => {
                  const scheduled = habit.status === 'active' && habit.scheduleDays.includes(WEEKDAYS[index].value);
                  const state = getHabitDaySummary(habit, logsByHabitAndDate.get(`${habit.id}:${date}`)).state;
                  const isFuture = date > today;
                  return (
                    <span
                      className={`habit-day ${scheduled ? 'scheduled' : ''} ${state} ${date === today ? 'today' : ''} ${isFuture ? 'future' : ''}`}
                      key={date}
                      title={`${WEEKDAYS[index].label}: ${scheduled ? 'запланировано' : 'не запланировано'}`}
                    >
                      <i>{WEEKDAYS[index].short}</i>
                      <b>{Number(date.slice(-2))}</b>
                    </span>
                  );
                })}
              </div>

              <div className="habit-card-footer">
                <span className="habit-week-progress">
                  <strong>{progress.completed} из {progress.planned}</strong> за эту неделю
                  {role && <i style={{ '--role-color': role.color }}>{role.title}</i>}
                </span>

                {habit.status === 'active' && isHabitScheduledForDate(habit, today) && habit.direction === 'build' && habit.trackingType === 'check' && (
                  <button
                    className={`habit-done-button ${todayState === 'done' ? 'done' : ''}`}
                    onClick={() => onLogChange(habit, todayState === 'done' ? 'clear' : 'done')}
                    type="button"
                  >
                    {todayState === 'done' ? 'Отмечено ✓' : 'Отметить'}
                  </button>
                )}

                {habit.status === 'active' && isHabitScheduledForDate(habit, today) && canCompleteHabitTarget(habit) && (
                  <div className="habit-quantity-actions">
                    <div className="habit-counter" aria-label={`Сегодня: ${formatValue(habit, currentValue)}`}>
                      <button onClick={() => onLogChange(habit, 'value', Math.max(0, currentValue - step))} type="button" aria-label="Уменьшить">−</button>
                      <strong>{formatValue(habit, currentValue)}</strong>
                      <button onClick={() => onLogChange(habit, 'value', currentValue + step)} type="button" aria-label="Увеличить">+</button>
                    </div>
                    <button
                      className={`habit-complete-target ${todayState === 'done' ? 'done' : ''}`}
                      disabled={todayState === 'done'}
                      onClick={() => onLogChange(habit, 'done')}
                      type="button"
                      aria-label={todayState === 'done' ? 'Цель на сегодня выполнена' : `Отметить весь план: ${formatTarget(habit)}`}
                      title={todayState === 'done' ? 'Цель на сегодня выполнена' : `Отметить весь план: ${formatTarget(habit)}`}
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24">
                        <path d="m6.8 12.3 3.2 3.2 7.2-7.2" />
                      </svg>
                    </button>
                  </div>
                )}

                {habit.status === 'active' && isHabitScheduledForDate(habit, today) && habit.direction === 'reduce' && (
                  <div className="habit-reduce-actions">
                    {todayState !== 'episode' && (
                      <button
                        className={todayState === 'done' ? 'clean active' : 'clean'}
                        onClick={() => onLogChange(habit, todayState === 'done' ? 'clear' : 'done')}
                        type="button"
                      >
                        Без эпизодов
                      </button>
                    )}
                    <div className="habit-counter habit-episode-counter" aria-label={`Сегодня отмечено эпизодов: ${currentValue}`}>
                      <button
                        disabled={currentValue === 0}
                        onClick={() => onLogChange(habit, 'removeEpisode')}
                        type="button"
                        aria-label="Удалить последний эпизод"
                        title="Удалить последний отмеченный эпизод"
                      >
                        −
                      </button>
                      <strong>{currentValue} эп.</strong>
                      <button onClick={() => onLogChange(habit, 'episode')} type="button" aria-label="Отметить эпизод">+</button>
                    </div>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
