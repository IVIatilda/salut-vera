import { useEffect, useMemo, useState } from 'react';
import CustomSelect from '../../../shared/ui/CustomSelect.jsx';
import { PROJECT_STATUSES } from '../model/project-model.js';

export default function ProjectEditor({ project, projects, tasks, roles, isNew, onClose, onDelete, onSave }) {
  const [draft, setDraft] = useState(project);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const taskCount = tasks.filter((task) => task.projectId === project.id).length;
  const roleOptions = useMemo(() => [
    { value: '', label: 'Без сферы' },
    ...roles
      .filter((role) => role.status !== 'archived' || role.id === project.roleId)
      .map((role) => ({ value: role.id, label: role.title })),
  ], [roles, project.roleId]);

  useEffect(() => {
    setDraft(project);
    setConfirmDelete(false);
  }, [project]);

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

  function submit(event) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    onSave({
      ...draft,
      title: draft.title.trim(),
      description: draft.description.trim(),
      updatedAt: new Date().toISOString(),
    });
  }

  function updateRole(roleId) {
    const role = roles.find((item) => item.id === roleId);
    setDraft((current) => ({
      ...current,
      roleId: roleId || null,
      area: role?.title || 'Без сферы',
    }));
  }

  return (
    <div className="task-editor-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="task-editor project-editor" role="dialog" aria-modal="true" aria-labelledby="project-editor-title">
        <form onSubmit={submit}>
          <div className="task-editor-heading">
            <div>
              {!isNew && <span className="eyebrow">Проект</span>}
              <h2 id="project-editor-title">{isNew ? 'Новый проект' : draft.title}</h2>
            </div>
            <button className="editor-close" onClick={onClose} type="button" aria-label="Закрыть">×</button>
          </div>

          <label className="editor-field wide">
            <span>Название</span>
            <input value={draft.title} onChange={(event) => update('title', event.target.value)} autoFocus required />
          </label>

          <label className="editor-field wide">
            <span>Описание результата</span>
            <textarea value={draft.description} onChange={(event) => update('description', event.target.value)} rows="4" placeholder="Как будет выглядеть завершённый проект?" />
          </label>

          <div className="editor-grid">
            <div className="editor-field">
              <span>Статус</span>
              <CustomSelect value={draft.status} options={PROJECT_STATUSES} onChange={(value) => update('status', value)} ariaLabel="Статус проекта" />
            </div>
            <div className="editor-field">
              <span>Сфера жизни</span>
              <CustomSelect value={draft.roleId || ''} options={roleOptions} onChange={updateRole} ariaLabel="Сфера жизни проекта" />
            </div>
            <label className="editor-field wide">
              <span>Целевая дата</span>
              <input type="date" value={draft.targetDate} onChange={(event) => update('targetDate', event.target.value)} />
            </label>
          </div>

          {!isNew && <p className="project-editor-note">Связано задач: {taskCount}. При удалении проекта задачи сохранятся.</p>}

          <div className={`task-editor-actions ${isNew ? 'new-task-actions' : ''}`}>
            {!isNew && (confirmDelete ? (
              <div className="delete-confirmation">
                <span>Удалить проект?</span>
                <button className="delete-confirm" onClick={() => onDelete(project)} type="button">Удалить</button>
                <button onClick={() => setConfirmDelete(false)} type="button">Не удалять</button>
              </div>
            ) : (
              <button className="editor-delete" onClick={() => setConfirmDelete(true)} type="button">Удалить</button>
            ))}
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
