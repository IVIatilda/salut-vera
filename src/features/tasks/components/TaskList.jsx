import { useState } from 'react';
import { isTaskCompleted, localDateKey, sortTasks, taskMatchesView } from '../model/task-model.js';

const FILTERS = [
  ['active', 'Все'],
  ['upcoming', 'Предстоящие'],
  ['no_date', 'Без даты'],
  ['completed', 'Завершённые'],
];

function formatShortDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
    .format(new Date(`${value}T12:00:00`));
}

function formatTrackedTime(seconds = 0) {
  if (seconds < 60) return `${seconds} сек`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return restMinutes ? `${hours} ч ${restMinutes} мин` : `${hours} ч`;
}

function CheckIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function TaskRow({
  task,
  project,
  children,
  hasSubtasks,
  isExpanded,
  onOpen,
  onToggle,
  onToggleExpanded,
  nested = false,
}) {
  const completed = isTaskCompleted(task);
  const today = localDateKey();
  const overdue = !completed && task.dueDate && task.dueDate < today;
  const subtaskListId = `subtasks-${task.id}`;

  return (
    <div className={`task-entry ${nested ? 'nested' : ''}`}>
      <article className={`task-row ${completed ? 'completed' : ''}`}>
        <button
          className="task-check"
          type="button"
          onClick={() => onToggle(task)}
          aria-label={completed ? `Вернуть задачу «${task.title}»` : `Завершить задачу «${task.title}»`}
        >
          {completed && <CheckIcon />}
        </button>
        <div className="task-content">
          <button className="task-title" type="button" onClick={() => onOpen(task)}>
            <strong>{task.title}</strong>
          </button>
          <span className="task-meta">
            {task.isUrgent && <i className="task-tag urgent">Срочно</i>}
            {task.importance === 'high' && <i className="task-tag important">Важно</i>}
            {project && <i className="task-project">{project.title}</i>}
            {task.area && task.area !== 'Без сферы' && <i>{task.area}</i>}
            {task.scheduledDate && <i>{formatShortDate(task.scheduledDate)}</i>}
            {task.dueDate && <i className={overdue ? 'overdue' : ''}>до {formatShortDate(task.dueDate)}</i>}
            {task.estimate > 0 && <i>{task.estimate} мин</i>}
            {task.trackedSeconds > 0 && <i>{formatTrackedTime(task.trackedSeconds)} в фокусе</i>}
          </span>
        </div>
        {hasSubtasks && (
          <button
            className={`task-chevron ${isExpanded ? 'expanded' : ''}`}
            type="button"
            onClick={() => onToggleExpanded(task.id)}
            aria-label={isExpanded ? `Свернуть подзадачи «${task.title}»` : `Развернуть подзадачи «${task.title}»`}
            aria-expanded={isExpanded}
            aria-controls={subtaskListId}
          >
            <span aria-hidden="true">›</span>
          </button>
        )}
      </article>
      {children}
    </div>
  );
}

export default function TaskList({
  tasks,
  projects,
  view,
  filter,
  onFilterChange,
  onAdd,
  onToggle,
  onOpen,
  isLoading,
}) {
  const [title, setTitle] = useState('');
  const [expandedTaskIds, setExpandedTaskIds] = useState(() => new Set());
  const roots = sortTasks(tasks.filter((task) => taskMatchesView(task, view, filter)));

  function submitTask(event) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    onAdd(cleanTitle);
    setTitle('');
  }

  function toggleSubtasks(taskId) {
    setExpandedTaskIds((current) => {
      const next = new Set(current);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  function renderTask(task, nested = false) {
    const subtasks = sortTasks(tasks.filter((item) => item.parentTaskId === task.id && item.status !== 'cancelled'));
    const hasSubtasks = subtasks.length > 0;
    const isExpanded = expandedTaskIds.has(task.id);
    return (
      <TaskRow
        key={task.id}
        task={task}
        project={projects.find((project) => project.id === task.projectId)}
        hasSubtasks={hasSubtasks}
        isExpanded={isExpanded}
        nested={nested}
        onOpen={onOpen}
        onToggle={onToggle}
        onToggleExpanded={toggleSubtasks}
      >
        {hasSubtasks && (
          <div className="subtask-list" id={`subtasks-${task.id}`} hidden={!isExpanded}>
            {subtasks.map((subtask) => renderTask(subtask, true))}
          </div>
        )}
      </TaskRow>
    );
  }

  const emptyText = view === 'inbox'
    ? 'Входящие пусты. Запишите всё, что не хочется держать в голове.'
    : view === 'today'
      ? 'На сегодня задач нет. Добавьте одно небольшое действие.'
      : 'В этой подборке пока нет задач.';

  return (
    <section className="task-panel">
      {view === 'tasks' && (
        <div className="task-filters" aria-label="Фильтры задач">
          {FILTERS.map(([id, label]) => (
            <button
              className={filter === id ? 'active' : ''}
              key={id}
              onClick={() => onFilterChange(id)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <form className="quick-add" onSubmit={submitTask}>
        <label className="sr-only" htmlFor={`new-task-${view}`}>Новая задача</label>
        <input
          id={`new-task-${view}`}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={'Быстрое добавление задачи'}
          autoComplete="off"
        />
        <button type="submit">+</button>
      </form>

      <div className="task-list" aria-live="polite">
        {isLoading && <p className="empty-message">Загружаем задачи…</p>}
        {!isLoading && roots.length === 0 && <p className="empty-message">{emptyText}</p>}
        {roots.map(renderTask)}
      </div>
    </section>
  );
}
