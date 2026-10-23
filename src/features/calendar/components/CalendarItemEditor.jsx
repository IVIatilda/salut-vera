import { useEffect, useState } from 'react';
import CustomSelect from '../../../shared/ui/CustomSelect.jsx';
import { CALENDAR_WEEKDAYS } from '../model/calendar-model.js';

const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'Не повторять' },
  { value: 'daily', label: 'Каждый день' },
  { value: 'weekly', label: 'Каждую неделю' },
  { value: 'monthly', label: 'Каждый месяц' },
  { value: 'yearly', label: 'Каждый год' },
  { value: 'interval', label: 'Раз в N дней' },
  { value: 'weekdays', label: 'По дням недели' },
];

function initialExpandedFields(item) {
  return {
    time: Boolean(item.time),
    recurrence: Boolean(item.recurrence && item.recurrence !== 'none'),
    note: Boolean(item.note?.trim()),
  };
}

function OptionalField({ id, label, isOpen, onToggle, children }) {
  return (
    <div className={`optional-task-field ${isOpen ? 'open' : ''}`} data-field={id}>
      <button className="optional-task-field-toggle" type="button" aria-expanded={isOpen} onClick={() => onToggle(id)}>
        <span>{label}</span>
        <i aria-hidden="true">{isOpen ? '−' : '+'}</i>
      </button>
      {isOpen && <div className="optional-task-field-content">{children}</div>}
    </div>
  );
}

export default function CalendarItemEditor({ item, isNew, onClose, onDelete, onSave }) {
  const [draft, setDraft] = useState(item);
  const [expandedFields, setExpandedFields] = useState(() => initialExpandedFields(item));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setDraft(item);
    setExpandedFields(initialExpandedFields(item));
    setConfirmDelete(false);
    setError('');
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
    setError('');
  }

  function chooseKind(kind) {
    update('kind', kind);
  }

  function toggleOptionalField(field) {
    setExpandedFields((current) => ({ ...current, [field]: !current[field] }));
  }

  function toggleWeekday(day) {
    const weekdays = draft.weekdays.includes(day)
      ? draft.weekdays.filter((itemDay) => itemDay !== day)
      : [...draft.weekdays, day].sort();
    update('weekdays', weekdays);
  }

  function submit(event) {
    event.preventDefault();
    const title = draft.title.trim();
    if (!title || !draft.startDate) return;
    if (draft.endDate && draft.endDate < draft.startDate) {
      setError('Дата окончания не может быть раньше даты начала.');
      return;
    }
    if (draft.recurrence === 'weekdays' && draft.weekdays.length === 0) {
      setError('Выберите хотя бы один день недели.');
      return;
    }

    onSave({
      ...draft,
      title,
      note: draft.note.trim(),
      endDate: draft.recurrence === 'none' ? '' : draft.endDate,
      intervalDays: Math.max(1, Math.floor(Number(draft.intervalDays) || 1)),
      weekdays: draft.recurrence === 'weekdays' ? draft.weekdays : [],
      updatedAt: new Date().toISOString(),
    });
  }

  const typeLabel = draft.kind === 'reminder' ? 'напоминание' : 'важную дату';

  return (
    <div className="task-editor-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="task-editor calendar-item-editor" role="dialog" aria-modal="true" aria-labelledby="calendar-item-title">
        <form onSubmit={submit}>
          <div className="task-editor-heading">
            <div>
              {!isNew && <span className="eyebrow">{draft.kind === 'reminder' ? 'Напоминание' : 'Важная дата'}</span>}
              <h2 id="calendar-item-title">{isNew ? 'Новая запись' : draft.title}</h2>
            </div>
            <button className="editor-close" onClick={onClose} type="button" aria-label="Закрыть">×</button>
          </div>

          <fieldset className="calendar-item-kind">
            <legend>Тип записи</legend>
            <div>
              <button
                className={draft.kind === 'important' ? 'active important' : ''}
                onClick={() => chooseKind('important')}
                type="button"
                aria-pressed={draft.kind === 'important'}
              >
                <i aria-hidden="true">◆</i>
                <span><strong>Важная дата</strong><small>Праздник, день рождения, годовщина</small></span>
              </button>
              <button
                className={draft.kind === 'reminder' ? 'active reminder' : ''}
                onClick={() => chooseKind('reminder')}
                type="button"
                aria-pressed={draft.kind === 'reminder'}
              >
                <i aria-hidden="true">●</i>
                <span><strong>Напоминание</strong><small>Встреча, оплата, покупка</small></span>
              </button>
            </div>
          </fieldset>

          <label className="editor-field wide">
            <span>Название</span>
            <input
              autoFocus
              required
              value={draft.title}
              onChange={(event) => update('title', event.target.value)}
              placeholder={draft.kind === 'reminder' ? 'Например, оплатить интернет' : 'Например, день рождения мамы'}
            />
          </label>

          <label className="editor-field wide">
            <span>{draft.recurrence === 'none' ? 'Дата' : 'Начало'}</span>
            <input required type="date" value={draft.startDate} onChange={(event) => update('startDate', event.target.value)} />
          </label>

          <div className="calendar-item-optional-grid">
            <OptionalField id="time" label="Время" isOpen={expandedFields.time} onToggle={toggleOptionalField}>
              <input aria-label="Время записи" type="time" value={draft.time} onChange={(event) => update('time', event.target.value)} />
            </OptionalField>

            <OptionalField id="recurrence" label="Повторение" isOpen={expandedFields.recurrence} onToggle={toggleOptionalField}>
              <div className="calendar-item-schedule">
                <div className="calendar-recurrence-select">
                  <CustomSelect
                    value={draft.recurrence}
                    options={RECURRENCE_OPTIONS}
                    onChange={(value) => update('recurrence', value)}
                    ariaLabel="Повторение записи"
                  />
                </div>

                {draft.recurrence === 'interval' && (
                  <label className="editor-field calendar-interval-field">
                    <span>Интервал, дней</span>
                    <input
                      min="1"
                      max="365"
                      required
                      type="number"
                      value={draft.intervalDays}
                      onChange={(event) => update('intervalDays', event.target.value)}
                    />
                  </label>
                )}

                {draft.recurrence !== 'none' && (
                  <label className="editor-field calendar-end-date">
                    <span>Окончание <i>необязательно</i></span>
                    <input
                      min={draft.startDate}
                      type="date"
                      value={draft.endDate}
                      onChange={(event) => update('endDate', event.target.value)}
                    />
                  </label>
                )}
              </div>

              {draft.recurrence === 'weekdays' && (
                <fieldset className="calendar-weekday-picker">
                  <legend>Дни недели</legend>
                  <div>
                    {CALENDAR_WEEKDAYS.map((weekday, index) => {
                      const day = index + 1;
                      const selected = draft.weekdays.includes(day);
                      return (
                        <button
                          className={selected ? 'active' : ''}
                          key={weekday}
                          onClick={() => toggleWeekday(day)}
                          type="button"
                          aria-pressed={selected}
                        >
                          {weekday}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              )}
            </OptionalField>

            <OptionalField id="note" label="Заметка" isOpen={expandedFields.note} onToggle={toggleOptionalField}>
              <textarea
                aria-label="Заметка"
                rows="3"
                value={draft.note}
                onChange={(event) => update('note', event.target.value)}
                placeholder="Полезные детали"
              />
            </OptionalField>
          </div>

          {error && <p className="editor-validation-message" role="alert">{error}</p>}

          <div className={`task-editor-actions ${isNew ? 'new-task-actions' : ''}`}>
            {!isNew && (confirmDelete ? (
              <div className="delete-confirmation">
                <span>Удалить эту запись?</span>
                <button className="delete-confirm" onClick={() => onDelete(item)} type="button">Удалить</button>
                <button onClick={() => setConfirmDelete(false)} type="button">Не удалять</button>
              </div>
            ) : (
              <button className="editor-delete" onClick={() => setConfirmDelete(true)} type="button">Удалить</button>
            ))}
            <div>
              <button className="editor-cancel" onClick={onClose} type="button">Отмена</button>
              <button className="editor-save" type="submit">{isNew ? `Добавить ${typeLabel}` : 'Сохранить'}</button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
