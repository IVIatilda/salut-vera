import { useEffect, useMemo, useState } from 'react';
import { getCalendarEntries } from '../../calendar/model/calendar-model.js';
import { isTaskCompleted, taskMatchesView } from '../../tasks/model/task-model.js';
import {
  buildDailyPriorities,
  getDailyPriorityIds,
  toggleDailyPriority,
} from '../model/ritual-model.js';

const RATINGS = [1, 2, 3, 4, 5];

function formatRitualDate(dateKey) {
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${dateKey}T12:00:00`));
}

function calendarEntryLabel(type) {
  if (type === 'important') return 'Важная дата';
  if (type === 'reminder') return 'Напоминание';
  if (type === 'deadline') return 'Срок задачи';
  return 'Целевая дата проекта';
}

function RatingField({ label, lowLabel, lowEmoji, highLabel, highEmoji, value, onChange }) {
  return (
    <fieldset className="ritual-rating">
      <legend>{label}</legend>
      <div className="ritual-rating-scale">
        {RATINGS.map((rating) => (
          <button
            className={value === rating ? 'active' : ''}
            key={rating}
            onClick={() => onChange(value === rating ? null : rating)}
            type="button"
            aria-label={`${label}: ${rating} из 5`}
            aria-pressed={value === rating}
          >
            {rating}
          </button>
        ))}
      </div>
      <div className="ritual-rating-labels">
        <span role="img" aria-label={lowLabel}>{lowEmoji}</span>
        <span role="img" aria-label={highLabel}>{highEmoji}</span>
      </div>
    </fieldset>
  );
}

export default function MorningRitual({
  date,
  session,
  dailyPriorities,
  tasks,
  projects,
  calendarItems,
  onAddTask,
  onClose,
  onComplete,
}) {
  const initialPriorityIds = useMemo(
    () => getDailyPriorityIds(dailyPriorities, date),
    [dailyPriorities, date],
  );
  const [energyRating, setEnergyRating] = useState(session.energyRating);
  const [moodRating, setMoodRating] = useState(session.moodRating);
  const [priorityTaskIds, setPriorityTaskIds] = useState(initialPriorityIds);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const dayTasks = tasks.filter((task) => taskMatchesView(task, 'today', 'active', date));
  const ritualTaskOptions = tasks.filter((task) => (
    priorityTaskIds.includes(task.id) || dayTasks.some((item) => item.id === task.id)
  ));
  const calendarEntries = getCalendarEntries(tasks, projects, calendarItems, date)
    .filter((entry) => entry.type !== 'task' && !entry.completed);

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  function submitQuickTask(event) {
    event.preventDefault();
    const title = quickTaskTitle.trim();
    if (!title) return;
    onAddTask(title);
    setQuickTaskTitle('');
  }

  function completeRitual() {
    const completedAt = new Date().toISOString();
    onComplete({
      ...session,
      status: 'completed',
      currentStep: 1,
      energyRating,
      moodRating,
      completedAt,
      updatedAt: completedAt,
    }, buildDailyPriorities(date, priorityTaskIds));
  }

  return (
    <div className="ritual-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="morning-ritual" role="dialog" aria-modal="true" aria-labelledby="morning-ritual-title">
        <header className="ritual-header">
          <div className="ritual-sun" aria-hidden="true"><i /></div>
          <div className="ritual-heading-copy">
            <span>{formatRitualDate(date)}</span>
            <h2 id="morning-ritual-title">План на день</h2>
          </div>
          <button className="ritual-close" onClick={onClose} type="button" aria-label="Закрыть ритуал">×</button>
        </header>

        <div className="ritual-body">
          <div className="ritual-rating-grid">
            <RatingField
              label="Энергия"
              lowLabel="Мало сил"
              lowEmoji="🪫"
              highLabel="Много сил"
              highEmoji="🔋"
              value={energyRating}
              onChange={setEnergyRating}
            />
            <RatingField
              label="Настроение"
              lowLabel="Тяжёлое"
              lowEmoji="😔"
              highLabel="Лёгкое"
              highEmoji="😊"
              value={moodRating}
              onChange={setMoodRating}
            />
          </div>

          {calendarEntries.length > 0 && (
            <section className="ritual-calendar" aria-labelledby="ritual-calendar-title">
              <h3 id="ritual-calendar-title">В календаре</h3>
              <div className="ritual-calendar-list">
                {calendarEntries.map((entry) => (
                  <div className={`ritual-calendar-entry ${entry.type}`} key={entry.id}>
                    <i aria-hidden="true" />
                    <span>
                      <small>{calendarEntryLabel(entry.type)}</small>
                      <strong>{entry.time ? `${entry.time} · ${entry.title}` : entry.title}</strong>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <form className="ritual-quick-task" onSubmit={submitQuickTask}>
            <label className="sr-only" htmlFor="ritual-quick-task">Добавить задачу на сегодня</label>
            <input
              id="ritual-quick-task"
              value={quickTaskTitle}
              onChange={(event) => setQuickTaskTitle(event.target.value)}
              placeholder="Добавить задачу на сегодня"
              autoComplete="off"
            />
            <button type="submit" aria-label="Добавить задачу на сегодня">+</button>
          </form>

          {ritualTaskOptions.length === 0 ? (
            <p className="ritual-empty">На сегодня задач нет.</p>
          ) : (
            <div className="ritual-task-list" aria-label="Задачи на сегодня">
              {ritualTaskOptions.map((task) => {
                const selectedIndex = priorityTaskIds.indexOf(task.id);
                const selected = selectedIndex >= 0;
                const completed = isTaskCompleted(task);
                const disabled = (!selected && priorityTaskIds.length >= 3) || (completed && !selected);
                const belongsToToday = dayTasks.some((item) => item.id === task.id);
                const taskMeta = completed
                  ? 'Выполнено'
                  : belongsToToday
                    ? task.estimate > 0 ? `${task.estimate} мин` : 'Без оценки времени'
                    : 'Больше не в плане дня';
                return (
                  <button
                    className={`${selected ? 'selected' : ''} ${completed ? 'completed' : ''}`}
                    disabled={disabled}
                    key={task.id}
                    onClick={() => setPriorityTaskIds((current) => toggleDailyPriority(current, task.id))}
                    type="button"
                    aria-pressed={selected}
                  >
                    <i>{selected ? selectedIndex + 1 : completed ? '✓' : ''}</i>
                    <span>
                      <strong>{task.title}</strong>
                      <small>{taskMeta}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <footer className="ritual-actions">
          <button className="ritual-cancel" onClick={onClose} type="button">Закрыть</button>
          <button className="ritual-next" onClick={completeRitual} type="button">Сохранить план</button>
        </footer>
      </section>
    </div>
  );
}
