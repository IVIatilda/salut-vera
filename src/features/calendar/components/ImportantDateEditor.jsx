import { useEffect, useState } from 'react';

export default function ImportantDateEditor({ item, isNew, onClose, onDelete, onSave }) {
  const [draft, setDraft] = useState(item);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setDraft(item);
    setConfirmDelete(false);
  }, [item]);

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function submit(event) {
    event.preventDefault();
    const title = draft.title.trim();
    if (!title || !draft.date) return;
    onSave({
      ...draft,
      title,
      note: draft.note.trim(),
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <div className="task-editor-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="task-editor important-date-editor" role="dialog" aria-modal="true" aria-labelledby="important-date-title">
        <form onSubmit={submit}>
          <div className="task-editor-heading">
            <div>
              {!isNew && <span className="eyebrow">Важная дата</span>}
              <h2 id="important-date-title">{isNew ? 'Новая важная дата' : draft.title}</h2>
            </div>
            <button className="editor-close" onClick={onClose} type="button" aria-label="Закрыть">×</button>
          </div>

          <label className="editor-field wide">
            <span>Название</span>
            <input
              autoFocus
              required
              value={draft.title}
              onChange={(event) => update('title', event.target.value)}
              placeholder="Например, годовщина или день рождения"
            />
          </label>

          <label className="editor-field wide">
            <span>Дата</span>
            <input required type="date" value={draft.date} onChange={(event) => update('date', event.target.value)} />
          </label>

          <label className="important-date-repeat">
            <input
              type="checkbox"
              checked={draft.repeatsYearly}
              onChange={(event) => update('repeatsYearly', event.target.checked)}
            />
            <span>
              <strong>Повторять каждый год</strong>
              <i>Подойдёт для дней рождения и годовщин</i>
            </span>
          </label>

          <label className="editor-field wide">
            <span>Заметка</span>
            <textarea
              rows="3"
              value={draft.note}
              onChange={(event) => update('note', event.target.value)}
              placeholder="Например, что подарить или кого поздравить"
            />
          </label>

          <div className={`task-editor-actions ${isNew ? 'new-task-actions' : ''}`}>
            {!isNew && (confirmDelete ? (
              <div className="delete-confirmation">
                <span>Удалить эту дату?</span>
                <button className="delete-confirm" onClick={() => onDelete(item)} type="button">Удалить</button>
                <button onClick={() => setConfirmDelete(false)} type="button">Не удалять</button>
              </div>
            ) : (
              <button className="editor-delete" onClick={() => setConfirmDelete(true)} type="button">Удалить</button>
            ))}
            <div>
              <button className="editor-cancel" onClick={onClose} type="button">Отмена</button>
              <button className="editor-save" type="submit">{isNew ? 'Добавить' : 'Сохранить'}</button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
