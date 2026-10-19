import { useEffect, useState } from 'react';
import CustomSelect from '../../../shared/ui/CustomSelect.jsx';
import {
  HABIT_STATUSES,
  HABIT_TRACKING_TYPES,
  WEEKDAYS,
} from '../model/habit-model.js';

export default function HabitEditor({ habit, roles, isNew, onClose, onDelete, onSave }) {
  const [draft, setDraft] = useState(habit);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const cleanTitle = draft.title.trim();
  const roleOptions = [
    { value: '', label: 'Без сферы' },
    ...roles.filter((role) => role.status === 'active' || role.id === draft.roleId)
      .map((role) => ({ value: role.id, label: role.title })),
  ];

  useEffect(() => {
    setDraft(habit);
    setConfirmDelete(false);
  }, [habit]);

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

  function chooseDirection(direction) {
    setDraft((current) => ({
      ...current,
      direction,
      trackingType: direction === 'reduce' ? 'count' : current.trackingType,
      targetValue: direction === 'reduce' ? 1 : current.targetValue,
      targetUnit: direction === 'reduce' ? 'эпизод' : current.targetUnit,
    }));
  }

  function toggleWeekday(day) {
    setDraft((current) => {
      const selected = current.scheduleDays.includes(day)
        ? current.scheduleDays.filter((value) => value !== day)
        : [...current.scheduleDays, day].sort();
      return { ...current, scheduleDays: selected.length ? selected : current.scheduleDays };
    });
  }

  function submit(event) {
    event.preventDefault();
    if (!cleanTitle) return;
    onSave({
      ...draft,
      title: cleanTitle,
      description: draft.description.trim(),
      identityStatement: draft.identityStatement.trim(),
      cueWhen: draft.cueWhen.trim(),
      cueWhere: draft.cueWhere.trim(),
      cueAfter: draft.cueAfter.trim(),
      twoMinuteVersion: draft.twoMinuteVersion.trim(),
      environmentChange: draft.environmentChange.trim(),
      immediateReward: draft.immediateReward.trim(),
      roleId: draft.roleId || null,
      targetValue: Math.max(1, Number(draft.targetValue) || 1),
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <div className="task-editor-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="task-editor habit-editor" role="dialog" aria-modal="true" aria-labelledby="habit-editor-title">
        <form onSubmit={submit}>
          <div className="task-editor-heading">
            <div>
              <span className="eyebrow">Привычка</span>
              <h2 id="habit-editor-title">{isNew ? 'Новая привычка' : draft.title}</h2>
            </div>
            <button className="editor-close" onClick={onClose} type="button" aria-label="Закрыть">×</button>
          </div>

          <div className="habit-direction-choice" aria-label="Направление привычки">
            <button className={draft.direction === 'build' ? 'active build' : 'build'} onClick={() => chooseDirection('build')} type="button">
              <strong>Развивать</strong>
              <span>Добавить полезное действие</span>
            </button>
            <button className={draft.direction === 'reduce' ? 'active reduce' : 'reduce'} onClick={() => chooseDirection('reduce')} type="button">
              <strong>Ослаблять</strong>
              <span>Наблюдать и уменьшать эпизоды</span>
            </button>
          </div>

          <label className="editor-field wide">
            <span>Название</span>
            <input value={draft.title} onChange={(event) => update('title', event.target.value)} placeholder={draft.direction === 'build' ? 'Например, читать перед сном' : 'Например, не брать телефон за едой'} autoFocus required />
          </label>

          <label className="editor-field wide">
            <span>Какой человек так поступает?</span>
            <input value={draft.identityStatement} onChange={(event) => update('identityStatement', event.target.value)} placeholder="Например: я человек, который бережно относится к своему вниманию" />
          </label>

          <div className="editor-grid">
            <div className="editor-field">
              <span>Сфера жизни</span>
              <CustomSelect value={draft.roleId || ''} options={roleOptions} onChange={(value) => update('roleId', value)} ariaLabel="Сфера жизни привычки" />
            </div>
            <div className="editor-field">
              <span>Статус</span>
              <CustomSelect value={draft.status} options={HABIT_STATUSES} onChange={(value) => update('status', value)} ariaLabel="Статус привычки" />
            </div>
          </div>

          <fieldset className="habit-schedule">
            <legend>В какие дни?</legend>
            <div>
              {WEEKDAYS.map((day) => (
                <button className={draft.scheduleDays.includes(day.value) ? 'active' : ''} key={day.value} onClick={() => toggleWeekday(day.value)} type="button" aria-pressed={draft.scheduleDays.includes(day.value)}>
                  {day.short}
                </button>
              ))}
            </div>
          </fieldset>

          {draft.direction === 'build' && (
            <div className="editor-grid habit-target-row">
              <div className="editor-field">
                <span>Как отмечать?</span>
                <CustomSelect
                  value={draft.trackingType}
                  options={HABIT_TRACKING_TYPES}
                  onChange={(value) => setDraft((current) => ({
                    ...current,
                    trackingType: value,
                    targetValue: value === 'check' ? 1 : current.targetValue,
                    targetUnit: value === 'duration' ? 'мин' : value === 'count' ? 'раз' : '',
                  }))}
                  ariaLabel="Способ отслеживания привычки"
                />
              </div>
              {draft.trackingType !== 'check' && (
                <label className="editor-field habit-target-value">
                  <span>Цель на день</span>
                  <span className="input-with-unit">
                    <input type="number" min="1" value={draft.targetValue} onChange={(event) => update('targetValue', event.target.value)} />
                    <i>{draft.trackingType === 'duration' ? 'мин' : 'раз'}</i>
                  </span>
                </label>
              )}
            </div>
          )}

          <details className="habit-system-details">
            <summary>
              <span>
                <strong>Настроить систему привычки</strong>
                <i>Сигнал, простой старт, среда и поддержка</i>
              </span>
              <b aria-hidden="true">+</b>
            </summary>
            <div className="habit-system-grid">
              <label className="editor-field">
                <span>{draft.direction === 'build' ? 'После какого действия?' : 'Что обычно запускает эпизод?'}</span>
                <input value={draft.cueAfter} onChange={(event) => update('cueAfter', event.target.value)} placeholder="Например, после утреннего кофе" />
              </label>
              <label className="editor-field">
                <span>Когда?</span>
                <input value={draft.cueWhen} onChange={(event) => update('cueWhen', event.target.value)} placeholder="Например, в 8:00" />
              </label>
              <label className="editor-field">
                <span>Где?</span>
                <input value={draft.cueWhere} onChange={(event) => update('cueWhere', event.target.value)} placeholder="Например, на кухне" />
              </label>
              <label className="editor-field">
                <span>{draft.direction === 'build' ? 'Версия на две минуты' : 'Полезная замена'}</span>
                <input value={draft.twoMinuteVersion} onChange={(event) => update('twoMinuteVersion', event.target.value)} placeholder={draft.direction === 'build' ? 'Открыть книгу и прочитать одну страницу' : 'Сделать три спокойных вдоха'} />
              </label>
              <label className="editor-field">
                <span>{draft.direction === 'build' ? 'Как упростить среду?' : 'Как добавить трение?'}</span>
                <input value={draft.environmentChange} onChange={(event) => update('environmentChange', event.target.value)} placeholder={draft.direction === 'build' ? 'Положить книгу на подушку' : 'Оставлять телефон в другой комнате'} />
              </label>
              <label className="editor-field wide">
                <span>Мгновенная поддержка</span>
                <input value={draft.immediateReward} onChange={(event) => update('immediateReward', event.target.value)} placeholder="Что поможет заметить и закрепить маленькую победу?" />
              </label>
            </div>
          </details>

          <div className="task-editor-actions">
            {isNew ? (
              <span className="new-task-hint">Начните настолько легко, чтобы действие было трудно пропустить</span>
            ) : confirmDelete ? (
              <div className="delete-confirmation">
                <span>Удалить привычку и её историю?</span>
                <button className="delete-confirm" onClick={() => onDelete(habit)} type="button">Удалить</button>
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
