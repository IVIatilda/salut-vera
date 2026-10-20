import { useEffect, useRef, useState } from 'react';
import CustomSelect from '../../../shared/ui/CustomSelect.jsx';
import { LIFE_AREA_SUGGESTIONS, ROLE_COLORS, ROLE_STATUSES } from '../model/role-model.js';

export default function RoleEditor({ role, roles, tasks, projects, isNew, onClose, onDelete, onSave }) {
  const [draft, setDraft] = useState(role);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef(null);
  const linkedTasks = tasks.filter((task) => task.roleId === role.id || (!task.roleId && task.area === role.title));
  const linkedProjects = projects.filter((project) => project.roleId === role.id || (!project.roleId && project.area === role.title));
  const cleanTitle = draft.title.trim();
  const titleExists = roles.some((item) => item.id !== role.id && item.title.toLocaleLowerCase('ru-RU') === cleanTitle.toLocaleLowerCase('ru-RU'));

  useEffect(() => {
    setDraft(role);
    setConfirmDelete(false);
    setShowSuggestions(false);
  }, [role]);

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key !== 'Escape') return;
      if (showSuggestions) {
        setShowSuggestions(false);
        return;
      }
      if (!document.querySelector('.custom-select.open')) onClose();
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose, showSuggestions]);

  useEffect(() => {
    if (!showSuggestions) return undefined;
    function closeSuggestions(event) {
      if (!suggestionsRef.current?.contains(event.target)) setShowSuggestions(false);
    }
    window.addEventListener('mousedown', closeSuggestions);
    return () => window.removeEventListener('mousedown', closeSuggestions);
  }, [showSuggestions]);

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function submit(event) {
    event.preventDefault();
    if (!cleanTitle || titleExists) return;
    onSave({
      ...draft,
      title: cleanTitle,
      identity: draft.identity.trim(),
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <div className="task-editor-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="task-editor role-editor" role="dialog" aria-modal="true" aria-labelledby="role-editor-title">
        <form onSubmit={submit}>
          <div className="task-editor-heading">
            <div>
              {!isNew && <span className="eyebrow">Сфера жизни</span>}
              <h2 id="role-editor-title">{isNew ? 'Новая сфера' : draft.title}</h2>
            </div>
            <button className="editor-close" onClick={onClose} type="button" aria-label="Закрыть">×</button>
          </div>

          <div className="editor-field wide life-area-title-field">
            <div className="life-area-title-label">
              <label htmlFor="life-area-title">Название</label>
              {isNew && (
                <div className="life-area-suggestions" ref={suggestionsRef}>
                  <button
                    className="life-area-suggestions-toggle"
                    type="button"
                    aria-label="Показать готовые варианты сфер жизни"
                    aria-expanded={showSuggestions}
                    title="Готовые варианты"
                    onClick={() => setShowSuggestions((current) => !current)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M9 18h6M10 22h4M8.2 14.5A6 6 0 1 1 15.8 14.5C14.7 15.3 14 16.1 14 18h-4c0-1.9-.7-2.7-1.8-3.5Z" />
                    </svg>
                  </button>
                  {showSuggestions && (
                    <div className="life-area-suggestions-popover" role="dialog" aria-label="Готовые сферы жизни">
                      <strong>Готовые варианты</strong>
                      <span>Выберите подходящий или введите свой.</span>
                      <div className="life-area-suggestion-list">
                        {LIFE_AREA_SUGGESTIONS.map((suggestion) => (
                          <button
                            className={draft.title === suggestion ? 'selected' : ''}
                            key={suggestion}
                            type="button"
                            onClick={() => {
                              update('title', suggestion);
                              setShowSuggestions(false);
                            }}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <input id="life-area-title" value={draft.title} onChange={(event) => update('title', event.target.value)} placeholder="Например, здоровье" autoFocus required />
            {titleExists && <small className="editor-field-error">Такая сфера уже существует</small>}
          </div>

          <label className="editor-field wide">
            <span>Как я хочу проявляться в этой сфере?</span>
            <textarea
              value={draft.identity}
              onChange={(event) => update('identity', event.target.value)}
              rows="4"
              placeholder="Например: регулярно заботиться о здоровье и бережно относиться к своему телу"
            />
          </label>

          <div className="editor-grid">
            <div className="editor-field">
              <span>Статус</span>
              <CustomSelect value={draft.status} options={ROLE_STATUSES} onChange={(value) => update('status', value)} ariaLabel="Статус сферы жизни" />
            </div>
            <fieldset className="editor-field role-color-field">
              <legend>Цвет</legend>
              <div className="role-color-options">
                {ROLE_COLORS.map((color) => (
                  <label key={color} title={color}>
                    <input type="radio" name="role-color" value={color} checked={draft.color === color} onChange={() => update('color', color)} />
                    <span style={{ background: color }} />
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          {!isNew && (
            <p className="project-editor-note">
              Связано задач: {linkedTasks.length}. Связано проектов: {linkedProjects.length}.
            </p>
          )}

          <div className={`task-editor-actions ${isNew ? 'new-task-actions' : ''}`}>
            {!isNew && (confirmDelete ? (
              <div className="delete-confirmation">
                <span>Удалить сферу? Связи с задачами и проектами будут сняты.</span>
                <button className="delete-confirm" onClick={() => onDelete(role)} type="button">Удалить</button>
                <button onClick={() => setConfirmDelete(false)} type="button">Не удалять</button>
              </div>
            ) : (
              <button className="editor-delete" onClick={() => setConfirmDelete(true)} type="button">Удалить</button>
            ))}
            <div>
              <button className="editor-cancel" onClick={onClose} type="button">Отмена</button>
              <button className="editor-save" disabled={titleExists} type="submit">{isNew ? 'Создать' : 'Сохранить'}</button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
