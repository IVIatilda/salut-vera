import { useMemo, useState } from 'react';
import {
  createSubtaskSummaryMap,
  isTaskCompleted,
  localDateKey,
  sortTasks,
  taskMatchesView,
} from '../model/task-model.js';

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

function DescendantIndicators({ hasUrgent, hasImportant }) {
  if (!hasUrgent && !hasImportant) return null;

  return (
    <span className="task-descendant-indicators">
      {hasUrgent && (
        <span className="task-descendant-indicator urgent" role="img" aria-label="В подзадачах есть срочные задачи" title="В подзадачах есть срочные задачи">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M9.2 1.5 3.8 9h3.5l-.5 5.5 5.4-7.7H8.7z" />
          </svg>
        </span>
      )}
      {hasImportant && (
        <span className="task-descendant-indicator important" role="img" aria-label="В подзадачах есть важные задачи" title="В подзадачах есть важные задачи">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="m8 1.5 1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.2l-3.8 2 .7-4.3-3.1-3 4.3-.6z" />
          </svg>
        </span>
      )}
    </span>
  );
}

function TaskRow({
  task,
  project,
  role,
  children,
  hasSubtasks,
  isExpanded,
  subtaskSummary,
  onOpen,
  onToggle,
  onToggleExpanded,
  nested = false,
}) {
  const completed = isTaskCompleted(task);
  const today = localDateKey();
  const overdue = !completed && task.dueDate && task.dueDate < today;
  const subtaskListId = `subtasks-${task.id}`;
  const ownEstimate = Math.max(0, Number(task.estimate) || 0);
  const plannedMinutes = ownEstimate || (hasSubtasks ? subtaskSummary.estimatedMinutes : 0);
  const estimateIsApproximate = ownEstimate === 0 && hasSubtasks && subtaskSummary.isApproximate;
  const hasCalculatedEstimate = plannedMinutes > 0 || estimateIsApproximate;
  const hasTrackedTime = task.trackedSeconds > 0;
  const isOverrun = plannedMinutes > 0 && task.trackedSeconds > plannedMinutes * 60;

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
            <DescendantIndicators
              hasUrgent={subtaskSummary.hasUrgent}
              hasImportant={subtaskSummary.hasImportant}
            />
          </button>
          <span className="task-meta">
            {task.isUrgent && <i className="task-tag urgent">Срочно</i>}
            {task.importance === 'high' && <i className="task-tag important">Важно</i>}
            {project && <i className="task-project">{project.title}</i>}
            {(role?.title || (task.area && task.area !== 'Без сферы' ? task.area : '')) && (
              <i>{role?.title || task.area}</i>
            )}
            {task.scheduledDate && <i>{formatShortDate(task.scheduledDate)}</i>}
            {task.dueDate && <i className={overdue ? 'overdue' : ''}>до {formatShortDate(task.dueDate)}</i>}
            {!hasTrackedTime && hasCalculatedEstimate && (
              <i
                className={estimateIsApproximate ? 'task-estimate approximate' : 'task-estimate'}
                title={estimateIsApproximate ? 'Не у всех подзадач указано плановое время' : undefined}
              >
                {estimateIsApproximate && '≈ '}
                {plannedMinutes > 0 ? `${plannedMinutes} мин` : '? мин'}
              </i>
            )}
            {hasTrackedTime && hasCalculatedEstimate && (
              <i
                className={`task-time-ratio ${isOverrun ? 'overrun' : ''}`}
                title={`${formatTrackedTime(task.trackedSeconds)} затрачено из ${estimateIsApproximate ? 'примерно ' : ''}${plannedMinutes || '?'} мин запланированных`}
              >
                {formatTrackedTime(task.trackedSeconds)}
                <span aria-hidden="true">/</span>
                {estimateIsApproximate && '≈ '}
                {plannedMinutes > 0 ? `${plannedMinutes} мин` : '? мин'}
              </i>
            )}
            {hasTrackedTime && !hasCalculatedEstimate && <i>{formatTrackedTime(task.trackedSeconds)} затрачено</i>}
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
  roles,
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
  const childrenByParentId = useMemo(() => {
    const grouped = new Map();
    tasks.forEach((task) => {
      if (!task.parentTaskId || task.status === 'cancelled') return;
      const children = grouped.get(task.parentTaskId) || [];
      children.push(task);
      grouped.set(task.parentTaskId, children);
    });
    grouped.forEach((children, parentId) => grouped.set(parentId, sortTasks(children)));
    return grouped;
  }, [tasks]);
  const subtaskSummaries = useMemo(() => createSubtaskSummaryMap(tasks), [tasks]);

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
    const subtasks = childrenByParentId.get(task.id) || [];
    const hasSubtasks = subtasks.length > 0;
    const isExpanded = expandedTaskIds.has(task.id);
    const subtaskSummary = subtaskSummaries.get(task.id) || {
      estimatedMinutes: 0,
      isApproximate: false,
      hasUrgent: false,
      hasImportant: false,
    };
    return (
      <TaskRow
        key={task.id}
        task={task}
        project={projects.find((project) => project.id === task.projectId)}
        role={roles.find((role) => role.id === task.roleId)}
        hasSubtasks={hasSubtasks}
        isExpanded={isExpanded}
        subtaskSummary={subtaskSummary}
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
