import { useEffect, useMemo, useState } from 'react';
import CustomSelect from '../../../shared/ui/CustomSelect.jsx';
import { IMPORTANCE_LEVELS, TASK_STATUSES, truncateTaskTitle } from '../model/task-model.js';

const DEFAULT_AREAS = ['Работа', 'Семья', 'Здоровье', 'Дружба', 'Финансы', 'Отдых', 'Творчество'];

export default function TaskEditor({ task, tasks, projects, parentTask, isNew = false, onBack, onClose, onOpenTask, onDelete, onSave, onAddSubtask }) {
  const [draft, setDraft] = useState(task);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const areas = useMemo(() => Array.from(new Set([
    ...DEFAULT_AREAS,
    ...tasks.map((item) => item.area).filter((area) => area && area !== 'Без сферы'),
  ])), [tasks]);
  const areaOptions = useMemo(() => [
    { value: 'Без сферы', label: 'Не выбрана' },
    ...areas.map((area) => ({ value: area, label: area })),
  ], [areas]);
  const projectOptions = useMemo(() => [
    { value: '', label: 'Без проекта' },
    ...projects
      .filter((project) => project.status !== 'archived' && (project.status !== 'completed' || project.id === task.projectId))
      .map((project) => ({ value: project.id, label: project.title })),
  ], [projects, task.projectId]);
  const subtasks = tasks.filter((item) => item.parentTaskId === task.id && item.status !== 'cancelled');
  const isSubtask = Boolean(task.parentTaskId);

  useEffect(() => {
    setDraft(task);
    setSubtaskTitle('');
    setConfirmDelete(false);
  }, [task]);

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape' && !document.querySelector('.custom-select.open')) onClose();
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateProject(projectId) {
    const project = projects.find((item) => item.id === projectId);
    setDraft((current) => ({
      ...current,
      projectId: projectId || null,
      area: current.area === 'Без сферы' && project?.area ? project.area : current.area,
    }));
  }

  function submit(event) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    onSave({
      ...draft,
      title: draft.title.trim(),
      description: draft.description.trim(),
      estimate: Math.max(0, Number(draft.estimate) || 0),
      completed: draft.status === 'completed',
      completedAt: draft.status === 'completed' ? draft.completedAt || new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    });
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
      <section className="task-editor" role="dialog" aria-modal="true" aria-labelledby="task-editor-title">
        <form onSubmit={submit}>
          {parentTask && (
            <button className="editor-back" onClick={onBack} title={parentTask.title} type="button">
              <span className="editor-back-arrow" aria-hidden="true">←</span>
              <span className="editor-back-label">Вернуться назад к задаче «{truncateTaskTitle(parentTask.title)}»</span>
            </button>
          )}
          <div className="task-editor-heading">
            <div>
              <span className="eyebrow">{isSubtask ? 'Подзадача' : 'Задача'}</span>
              <h2 id="task-editor-title">{isNew ? 'Новая задача' : draft.title}</h2>
            </div>
            <button className="editor-close" onClick={onClose} type="button" aria-label="Закрыть">×</button>
          </div>

          <label className="editor-field wide">
            <span>Название</span>
            <input value={draft.title} onChange={(event) => update('title', event.target.value)} autoFocus required />
          </label>

          <label className="editor-field wide">
            <span>Описание</span>
            <textarea
              value={draft.description}
              onChange={(event) => update('description', event.target.value)}
              placeholder="Контекст, ссылки или ожидаемый результат"
              rows="4"
            />
          </label>

          <div className="editor-grid">
            <div className="editor-field">
              <span>Статус</span>
              <CustomSelect
                value={draft.status}
                options={TASK_STATUSES}
                onChange={(value) => update('status', value)}
                ariaLabel="Статус"
              />
            </div>

            <div className="editor-field">
              <span>Сфера жизни</span>
              <CustomSelect
                value={draft.area}
                options={areaOptions}
                onChange={(value) => update('area', value)}
                ariaLabel="Сфера жизни"
              />
            </div>

            <div className="editor-field wide">
              <span>Проект</span>
              <CustomSelect
                value={draft.projectId || ''}
                options={projectOptions}
                onChange={updateProject}
                ariaLabel="Проект"
              />
            </div>

            <label className="editor-field">
              <span>Запланировать</span>
              <input type="date" value={draft.scheduledDate} onChange={(event) => update('scheduledDate', event.target.value)} />
            </label>

            <label className="editor-field">
              <span>Дедлайн</span>
              <input type="date" value={draft.dueDate} onChange={(event) => update('dueDate', event.target.value)} />
            </label>

            <div className="editor-field">
              <span>Важность</span>
              <CustomSelect
                value={draft.importance}
                options={IMPORTANCE_LEVELS}
                onChange={(value) => update('importance', value)}
                ariaLabel="Важность"
              />
            </div>

            <label className="editor-field">
              <span>Оценка, минут</span>
              <input
                type="number"
                min="0"
                max="1440"
                value={draft.estimate || ''}
                onChange={(event) => update('estimate', event.target.value)}
                placeholder="Не указана"
              />
            </label>
          </div>

          <label className="editor-checkbox">
            <input type="checkbox" checked={draft.isUrgent} onChange={(event) => update('isUrgent', event.target.checked)} />
            <span>Задача срочная</span>
          </label>

          {!isSubtask && !isNew && (
            <section className="editor-subtasks">
              <div className="editor-subtasks-heading">
                <strong>Подзадачи</strong>
                <span>{subtasks.length}</span>
              </div>
              {subtasks.map((subtask) => (
                <button key={subtask.id} type="button" onClick={() => onOpenTask(subtask, draft)}>
                  <span className={subtask.completed ? 'done' : ''}>{subtask.title}</span>
                  <i>›</i>
                </button>
              ))}
              <div className="subtask-add">
                <input
                  value={subtaskTitle}
                  onChange={(event) => setSubtaskTitle(event.target.value)}
                  onKeyDown={handleSubtaskKeyDown}
                  placeholder="Добавить подзадачу"
                />
                <button onClick={addSubtask} type="button">Добавить</button>
              </div>
            </section>
          )}

          <div className="task-editor-actions">
            {isNew ? (
              <span className="new-task-hint">Задача появится после сохранения</span>
            ) : confirmDelete ? (
              <div className="delete-confirmation">
                <span>Удалить задачу{subtasks.length ? ' и её подзадачи' : ''}?</span>
                <button className="delete-confirm" onClick={() => onDelete(task)} type="button">Удалить</button>
                <button onClick={() => setConfirmDelete(false)} type="button">Не удалять</button>
              </div>
            ) : (
              <button className="editor-delete" onClick={() => setConfirmDelete(true)} type="button">Удалить</button>
            )}
            <div>
              <button className="editor-cancel" onClick={onClose} type="button">Отмена</button>
              <button className="editor-save" type="submit">{isNew ? 'Создать' : 'Сохранить'}</button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
