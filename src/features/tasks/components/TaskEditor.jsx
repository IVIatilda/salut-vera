import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncAutocomplete from '../../../shared/ui/AsyncAutocomplete.jsx';
import CustomSelect from '../../../shared/ui/CustomSelect.jsx';
import { loadTaskOptions } from '../data/task-option-source.js';
import { getTaskDescendantIds, localDateKey, TASK_STATUSES, truncateTaskTitle } from '../model/task-model.js';

const IMPORTANCE_OPTIONS = [
  { value: 'unset', label: 'Без важности', icon: 'none' },
  { value: 'low', label: 'Низкая важность', icon: 'down' },
  { value: 'normal', label: 'Обычная важность', icon: 'normal' },
  { value: 'high', label: 'Высокая важность', icon: 'up' },
];

function initialExpandedFields(task) {
  return {
    description: Boolean(task.description?.trim()),
    role: Boolean(task.roleId),
    project: Boolean(task.projectId),
    scheduledDate: Boolean(task.scheduledDate),
    dueDate: Boolean(task.dueDate),
  };
}

function OptionalField({ id, label, isOpen, onToggle, wide = false, children }) {
  return (
    <div className={`optional-task-field ${wide ? 'wide' : ''} ${isOpen ? 'open' : ''}`} data-field={id}>
      <button className="optional-task-field-toggle" type="button" aria-expanded={isOpen} onClick={() => onToggle(id)}>
        <span>{label}</span>
        <i aria-hidden="true">{isOpen ? '−' : '+'}</i>
      </button>
      {isOpen && <div className="optional-task-field-content">{children}</div>}
    </div>
  );
}

function ImportanceIcon({ type }) {
  const paths = {
    none: 'M6 6l12 12M18 6 6 18',
    down: 'M12 5v14m-5-5 5 5 5-5',
    normal: 'M6 12h12',
    up: 'M12 19V5m-5 5 5-5 5 5',
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[type]} /></svg>;
}

function TimeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

function formatTrackedTime(seconds = 0) {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`;
}

export default function TaskEditor({ task, tasks, projects, roles, parentTask, isNew = false, onBack, onClose, onOpenTask, onDelete, onSave, onAddSubtask }) {
  const [draft, setDraft] = useState(task);
  const [expandedFields, setExpandedFields] = useState(() => initialExpandedFields(task));
  const [parentFieldOpen, setParentFieldOpen] = useState(Boolean(task.parentTaskId));
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [manualTimeOpen, setManualTimeOpen] = useState(false);
  const [manualMinutes, setManualMinutes] = useState('');
  const [manualDate, setManualDate] = useState(localDateKey());
  const [isSaving, setIsSaving] = useState(false);
  const roleOptions = useMemo(() => [
    { value: '', label: 'Без сферы' },
    ...roles
      .filter((role) => role.status !== 'archived' || role.id === task.roleId)
      .map((role) => ({ value: role.id, label: role.title })),
  ], [roles, task.roleId]);
  const projectOptions = useMemo(() => [
    { value: '', label: 'Без проекта' },
    ...projects
      .filter((project) => project.status !== 'archived' && (project.status !== 'completed' || project.id === task.projectId))
      .map((project) => ({ value: project.id, label: project.title })),
  ], [projects, task.projectId]);
  const subtasks = tasks.filter((item) => item.parentTaskId === task.id && item.status !== 'cancelled');
  const isSubtask = Boolean(draft.parentTaskId);
  const selectedParent = tasks.find((item) => item.id === draft.parentTaskId);
  const excludedParentIds = useMemo(() => {
    const ids = getTaskDescendantIds(tasks, task.id);
    ids.add(task.id);
    return ids;
  }, [tasks, task.id]);
  const loadParentOptions = useCallback(
    (request) => loadTaskOptions({ ...request, tasks, excludedIds: excludedParentIds }),
    [tasks, excludedParentIds],
  );

  useEffect(() => {
    setDraft(task);
    setExpandedFields(initialExpandedFields(task));
    setParentFieldOpen(Boolean(task.parentTaskId));
    setSubtaskTitle('');
    setConfirmDelete(false);
    setManualTimeOpen(false);
    setManualMinutes('');
    setManualDate(localDateKey());
    setIsSaving(false);
  }, [task]);

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape' && !document.querySelector('.custom-select.open, .async-autocomplete.open')) onClose();
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function toggleOptionalField(field) {
    setExpandedFields((current) => ({ ...current, [field]: !current[field] }));
  }

  function updateProject(projectId) {
    const project = projects.find((item) => item.id === projectId);
    setDraft((current) => ({
      ...current,
      projectId: projectId || null,
      roleId: current.roleId || project?.roleId || null,
      area: current.roleId || !project?.roleId
        ? current.area
        : roles.find((role) => role.id === project.roleId)?.title || project.area || 'Без сферы',
    }));
  }

  function updateRole(roleId) {
    const role = roles.find((item) => item.id === roleId);
    setDraft((current) => ({ ...current, roleId: roleId || null, area: role?.title || 'Без сферы' }));
  }

  async function submit(event) {
    event.preventDefault();
    if (!draft.title.trim() || isSaving) return;
    const minutes = Math.max(0, Number(manualMinutes) || 0);
    setIsSaving(true);
    try {
      await onSave({
        ...draft,
        title: draft.title.trim(),
        description: draft.description.trim(),
        estimate: Math.max(0, Number(draft.estimate) || 0),
        completed: draft.status === 'completed',
        completedAt: draft.status === 'completed' ? draft.completedAt || new Date().toISOString() : null,
        updatedAt: new Date().toISOString(),
      }, minutes > 0 ? { minutes, date: manualDate || localDateKey() } : null);
    } catch {
      setIsSaving(false);
    }
  }

  function addSubtask(event) {
    event.preventDefault();
    const cleanTitle = subtaskTitle.trim();
    if (!cleanTitle) return;
    onAddSubtask(task, cleanTitle);
    setSubtaskTitle('');
  }

  function handleSubtaskKeyDown(event) {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    addSubtask(event);
  }

  return (
    <div className="task-editor-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="task-editor compact-task-editor" role="dialog" aria-modal="true" aria-labelledby="task-editor-title">
        <form onSubmit={submit}>
          {parentTask && (
            <button className="editor-back" onClick={onBack} title={parentTask.title} type="button">
              <span className="editor-back-arrow" aria-hidden="true">←</span>
              <span className="editor-back-label">Вернуться назад к задаче «{truncateTaskTitle(parentTask.title)}»</span>
            </button>
          )}
          <div className="task-editor-heading">
            <div>
              {!isNew && <span className="eyebrow">{isSubtask ? 'Подзадача' : 'Задача'}</span>}
              <h2 id="task-editor-title">{isNew ? (isSubtask ? 'Новая подзадача' : 'Новая задача') : draft.title}</h2>
            </div>
            <button className="editor-close" onClick={onClose} type="button" aria-label="Закрыть">×</button>
          </div>

          <label className="editor-field wide">
            <span>Название</span>
            <input value={draft.title} onChange={(event) => update('title', event.target.value)} autoFocus required />
          </label>

          {parentFieldOpen || isSubtask ? (
            <div className="editor-field wide parent-task-field">
              <div className="editor-inline-label">
                <span>Родительская задача</span>
                {!isSubtask && <button type="button" onClick={() => setParentFieldOpen(false)}>Убрать</button>}
              </div>
              <AsyncAutocomplete
                value={draft.parentTaskId || ''}
                selectedLabel={selectedParent?.title || ''}
                loadOptions={loadParentOptions}
                onChange={(option) => update('parentTaskId', option?.value || null)}
                placeholder="Найти задачу"
                ariaLabel="Родительская задача"
              />
            </div>
          ) : (
            <button className="choose-parent-button" type="button" onClick={() => setParentFieldOpen(true)}>
              <span aria-hidden="true">+</span> Выбрать родительскую задачу
            </button>
          )}

          <OptionalField id="description" label="Описание" isOpen={expandedFields.description} onToggle={toggleOptionalField} wide>
            <textarea value={draft.description} onChange={(event) => update('description', event.target.value)} placeholder="Контекст, ссылки или ожидаемый результат" rows="4" />
          </OptionalField>

          <div className="editor-grid compact-core-fields">
            <div className="editor-field">
              <span>Статус</span>
              <CustomSelect value={draft.status} options={TASK_STATUSES} onChange={(value) => update('status', value)} ariaLabel="Статус" />
            </div>
            <fieldset className="editor-field importance-field">
              <legend>Важность</legend>
              <div className="importance-options">
                {IMPORTANCE_OPTIONS.map((option) => (
                  <button className={draft.importance === option.value ? `active ${option.value}` : option.value} key={option.value} type="button" title={option.label} aria-label={option.label} aria-pressed={draft.importance === option.value} onClick={() => update('importance', option.value)}>
                    <ImportanceIcon type={option.icon} />
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <label className="editor-checkbox compact-urgent-field">
            <input type="checkbox" checked={draft.isUrgent} onChange={(event) => update('isUrgent', event.target.checked)} />
            <span>Срочно</span>
          </label>

          <div className="task-optional-grid">
            <div className="task-optional-column">
              <OptionalField id="role" label="Сфера жизни" isOpen={expandedFields.role} onToggle={toggleOptionalField}>
                <CustomSelect value={draft.roleId || ''} options={roleOptions} onChange={updateRole} ariaLabel="Сфера жизни" />
              </OptionalField>
              <OptionalField id="scheduledDate" label="Запланировать" isOpen={expandedFields.scheduledDate} onToggle={toggleOptionalField}>
                <input type="date" value={draft.scheduledDate} onChange={(event) => update('scheduledDate', event.target.value)} />
              </OptionalField>
            </div>
            <div className="task-optional-column">
              <OptionalField id="project" label="Проект" isOpen={expandedFields.project} onToggle={toggleOptionalField}>
                <CustomSelect value={draft.projectId || ''} options={projectOptions} onChange={updateProject} ariaLabel="Проект" />
              </OptionalField>
              <OptionalField id="dueDate" label="Дедлайн" isOpen={expandedFields.dueDate} onToggle={toggleOptionalField}>
                <input type="date" value={draft.dueDate} onChange={(event) => update('dueDate', event.target.value)} />
              </OptionalField>
            </div>
          </div>

          <section className="task-time-card" aria-labelledby="task-time-title">
            <div className="task-time-heading">
              <span className="task-time-icon"><TimeIcon /></span>
              <strong id="task-time-title">Время</strong>
            </div>
            <div className="task-time-overview">
              <label className="task-time-plan">
                <span>Запланировано</span>
                <div className="estimate-input">
                  <input type="number" min="0" max="1440" value={draft.estimate || ''} onChange={(event) => update('estimate', event.target.value)} placeholder="0" aria-label="Оценка времени в минутах" />
                  <span>мин</span>
                </div>
              </label>
              <div className="task-time-actual">
                <span>Затрачено</span>
                <strong>{formatTrackedTime(draft.trackedSeconds)}</strong>
                <button type="button" aria-expanded={manualTimeOpen} onClick={() => setManualTimeOpen((current) => !current)}>{manualTimeOpen ? 'Отменить запись' : '+ Записать время'}</button>
              </div>
            </div>
            {manualTimeOpen && (
              <div className="manual-time-fields">
                <label><span>Минуты</span><input type="number" min="1" max="1440" value={manualMinutes} onChange={(event) => setManualMinutes(event.target.value)} placeholder="30" /></label>
                <label><span>Дата записи</span><input type="date" value={manualDate} onChange={(event) => setManualDate(event.target.value)} /></label>
              </div>
            )}
          </section>

          {!isSubtask && !isNew && (
            <section className="editor-subtasks">
              <div className="editor-subtasks-heading"><strong>Подзадачи</strong><span>{subtasks.length}</span></div>
              {subtasks.map((subtask) => (
                <button key={subtask.id} type="button" onClick={() => onOpenTask(subtask, draft)}><span className={subtask.completed ? 'done' : ''}>{subtask.title}</span><i>›</i></button>
              ))}
              <div className="subtask-add">
                <input value={subtaskTitle} onChange={(event) => setSubtaskTitle(event.target.value)} onKeyDown={handleSubtaskKeyDown} placeholder="Добавить подзадачу" />
                <button onClick={addSubtask} type="button">Добавить</button>
              </div>
            </section>
          )}

          <div className={`task-editor-actions ${isNew ? 'new-task-actions' : ''}`}>
            {!isNew && (confirmDelete ? (
              <div className="delete-confirmation"><span>Удалить задачу{subtasks.length ? ' и её подзадачи' : ''}?</span><button className="delete-confirm" onClick={() => onDelete(task)} type="button">Удалить</button><button onClick={() => setConfirmDelete(false)} type="button">Не удалять</button></div>
            ) : <button className="editor-delete" onClick={() => setConfirmDelete(true)} type="button">Удалить</button>)}
            <div><button className="editor-cancel" onClick={onClose} type="button">Отмена</button><button className="editor-save" disabled={isSaving} type="submit">{isSaving ? 'Сохранение…' : isNew ? 'Создать' : 'Сохранить'}</button></div>
          </div>
        </form>
      </section>
    </div>
  );
}
