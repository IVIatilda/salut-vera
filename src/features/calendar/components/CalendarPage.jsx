import { useMemo, useState } from 'react';
import {
  CALENDAR_WEEKDAYS,
  calendarDateKey,
  describeCalendarItemSchedule,
  describeHabitCalendarState,
  formatCalendarMonth,
  formatSelectedDate,
  getCalendarEntries,
  getCalendarHabitItems,
  getCalendarMonth,
  getCalendarMonthDays,
  shiftCalendarMonth,
} from '../model/calendar-model.js';

const MAX_CELL_ENTRIES = 2;
const MAX_HABIT_DOTS = 5;

function entryLabel(type) {
  if (type === 'important') return 'Важная дата';
  if (type === 'reminder') return 'Напоминание';
  if (type === 'deadline') return 'Срок задачи';
  if (type === 'project') return 'Целевая дата проекта';
  return 'План';
}

function DayEntry({ entry }) {
  return (
    <span className={`calendar-entry ${entry.type} ${entry.completed ? 'completed' : ''}`}>
      <i aria-hidden="true" />
      <b>{entry.time ? `${entry.time} · ${entry.title}` : entry.title}</b>
    </span>
  );
}

export default function CalendarPage({
  tasks,
  projects,
  habits,
  habitLogs,
  calendarItems,
  today,
  onAddCalendarItem,
  onOpenCalendarItem,
  onOpenProject,
  onOpenTask,
  onToggleTask,
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => getCalendarMonth(today));
  const [selectedDate, setSelectedDate] = useState(today);
  const monthDays = useMemo(() => getCalendarMonthDays(visibleMonth), [visibleMonth]);
  const selectedEntries = getCalendarEntries(tasks, projects, calendarItems, selectedDate);
  const selectedHabits = getCalendarHabitItems(habits, habitLogs, selectedDate, today);

  function chooseDate(day) {
    setSelectedDate(day.dateKey);
    if (!day.isCurrentMonth) setVisibleMonth(getCalendarMonth(day.date));
  }

  function moveMonth(offset) {
    const nextMonth = shiftCalendarMonth(visibleMonth, offset);
    setVisibleMonth(nextMonth);
    setSelectedDate(calendarDateKey(nextMonth));
  }

  function returnToToday() {
    setVisibleMonth(getCalendarMonth(today));
    setSelectedDate(today);
  }

  function openEntry(entry) {
    if (entry.type === 'important' || entry.type === 'reminder') onOpenCalendarItem(entry.item);
    else if (entry.type === 'project') onOpenProject(entry.item);
    else onOpenTask(entry.item);
  }

  return (
    <div className="calendar-page">
      <header className="calendar-toolbar">
        <div>
          <h1>{formatCalendarMonth(visibleMonth)}</h1>
        </div>
        <div className="calendar-toolbar-actions">
          <div className="calendar-month-controls" aria-label="Переключение месяца">
            <button onClick={() => moveMonth(-1)} type="button" aria-label="Предыдущий месяц">‹</button>
            <button onClick={returnToToday} type="button">Сегодня</button>
            <button onClick={() => moveMonth(1)} type="button" aria-label="Следующий месяц">›</button>
          </div>
          <button className="new-task-button" onClick={() => onAddCalendarItem(selectedDate)} type="button">
            Добавить запись
          </button>
        </div>
      </header>

      <section className="calendar-surface" aria-label={`Календарь, ${formatCalendarMonth(visibleMonth)}`}>
        <div className="calendar-weekdays" aria-hidden="true">
          {CALENDAR_WEEKDAYS.map((weekday) => <span key={weekday}>{weekday}</span>)}
        </div>
        <div className="calendar-grid">
          {monthDays.map((day) => {
            const entries = getCalendarEntries(tasks, projects, calendarItems, day.dateKey);
            const habitItems = getCalendarHabitItems(habits, habitLogs, day.dateKey, today);
            const hiddenCount = Math.max(0, entries.length - MAX_CELL_ENTRIES);
            const isToday = day.dateKey === today;
            const isSelected = day.dateKey === selectedDate;

            return (
              <button
                className={`calendar-day ${day.isCurrentMonth ? '' : 'outside'} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                key={day.dateKey}
                onClick={() => chooseDate(day)}
                type="button"
                aria-label={`${formatSelectedDate(day.dateKey)}${entries.length ? `, событий: ${entries.length}` : ''}${habitItems.length ? `, привычек: ${habitItems.length}` : ''}`}
                aria-pressed={isSelected}
              >
                <span className="calendar-day-number">{day.dayNumber}</span>
                <span className="calendar-day-entries">
                  {entries.slice(0, MAX_CELL_ENTRIES).map((entry) => <DayEntry entry={entry} key={entry.id} />)}
                  {hiddenCount > 0 && <span className="calendar-more">Ещё {hiddenCount}</span>}
                </span>
                {habitItems.length > 0 && (
                  <span className="calendar-habit-rhythm" aria-label={`Ритм привычек: ${habitItems.length}`}>
                    {habitItems.slice(0, MAX_HABIT_DOTS).map((item) => (
                      <i
                        className={item.state}
                        key={item.habit.id}
                        title={`${item.habit.title}: ${describeHabitCalendarState(item, day.dateKey, today)}`}
                      />
                    ))}
                    {habitItems.length > MAX_HABIT_DOTS && <b>+{habitItems.length - MAX_HABIT_DOTS}</b>}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <div className="calendar-lower-grid">
        <section className="calendar-day-details" aria-labelledby="calendar-selected-day">
          <div className="calendar-detail-heading">
            <div>
              <span className="eyebrow">Выбранный день</span>
              <h2 id="calendar-selected-day">{formatSelectedDate(selectedDate)}</h2>
            </div>
            <div className="calendar-detail-actions">
              <button className="text-button" onClick={() => onAddCalendarItem(selectedDate, 'important')} type="button">
                + Важная дата
              </button>
              <button className="text-button" onClick={() => onAddCalendarItem(selectedDate, 'reminder')} type="button">
                + Напоминание
              </button>
            </div>
          </div>

          {selectedEntries.length === 0 ? (
            <p className="calendar-detail-empty">Планов и важных дат пока нет.</p>
          ) : (
            <div className="calendar-detail-list">
              {selectedEntries.map((entry) => {
                const isTaskEntry = entry.type === 'task' || entry.type === 'deadline';
                return (
                  <article className={`calendar-detail-entry ${entry.type} ${entry.completed ? 'completed' : ''}`} key={entry.id}>
                    {isTaskEntry ? (
                      <button
                        className={`calendar-task-toggle ${entry.completed ? 'completed' : ''}`}
                        onClick={() => onToggleTask(entry.item)}
                        type="button"
                        aria-label={`${entry.completed ? 'Вернуть в работу' : 'Отметить выполненной'}: ${entry.title}`}
                        aria-pressed={entry.completed}
                        title={entry.completed ? 'Вернуть в работу' : 'Отметить выполненной'}
                      >
                        <span aria-hidden="true">✓</span>
                      </button>
                    ) : (
                      <span className="calendar-detail-icon" aria-hidden="true" />
                    )}
                    <button className="calendar-detail-open" onClick={() => openEntry(entry)} type="button">
                      <span>
                        <i>
                          {entry.completed ? 'Выполнено' : entryLabel(entry.type)}
                          {entry.time ? ` · ${entry.time}` : ''}
                        </i>
                        <strong>{entry.title}</strong>
                        {(entry.type === 'important' || entry.type === 'reminder') && (
                          <small>{describeCalendarItemSchedule(entry.item)}</small>
                        )}
                      </span>
                      <b aria-hidden="true">→</b>
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="calendar-habit-details" aria-labelledby="calendar-habits-title">
          <div className="calendar-detail-heading">
            <h2 id="calendar-habits-title">Ритм привычек</h2>
          </div>

          {selectedHabits.length === 0 ? (
            <p className="calendar-detail-empty">На этот день привычки не запланированы.</p>
          ) : (
            <div className="calendar-habit-list">
              {selectedHabits.map((item) => (
                <div className="calendar-habit-detail" key={item.habit.id}>
                  <i className={item.state} aria-hidden="true" />
                  <span>
                    <strong>{item.habit.title}</strong>
                    <small>{describeHabitCalendarState(item, selectedDate, today)}</small>
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="calendar-legend" aria-label="Обозначения ритма привычек">
            <span><i className="done" />Выполнено</span>
            <span><i className="partial" />Частично</span>
            <span><i className="episode" />Эпизод</span>
            <span><i className="empty" />Нет отметки</span>
          </div>
        </section>
      </div>
    </div>
  );
}
