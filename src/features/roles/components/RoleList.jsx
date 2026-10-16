import { useState } from 'react';
import { isRoleActive } from '../model/role-model.js';
import { isTaskCompleted } from '../../tasks/model/task-model.js';

const FILTERS = [
  ['active', 'Активные'],
  ['all', 'Все'],
  ['archived', 'В архиве'],
];

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`;
}

function belongsToRole(item, role) {
  return item.roleId === role.id || (!item.roleId && item.area === role.title);
}

export default function RoleList({ roles, tasks, projects, onOpen }) {
  const [filter, setFilter] = useState('active');
  const visibleRoles = roles.filter((role) => {
    if (filter === 'active') return isRoleActive(role);
    if (filter === 'archived') return role.status === 'archived';
    return true;
  });

  return (
    <section className="roles-panel">
      <div className="task-filters" aria-label="Фильтры сфер жизни">
        {FILTERS.map(([id, label]) => (
          <button className={filter === id ? 'active' : ''} key={id} onClick={() => setFilter(id)} type="button">
            {label}
          </button>
        ))}
      </div>

      {visibleRoles.length === 0 ? (
        <div className="projects-empty">
          <strong>{filter === 'active' ? 'Сфер жизни пока нет' : 'В этой подборке сфер нет'}</strong>
          <span>Добавьте первую сферу самостоятельно или выберите готовую подсказку.</span>
        </div>
      ) : (
        <div className="role-grid">
          {visibleRoles.map((role) => {
            const roleTasks = tasks.filter((task) => task.status !== 'cancelled' && belongsToRole(task, role));
            const activeTasks = roleTasks.filter((task) => !isTaskCompleted(task)).length;
            const roleProjects = projects.filter((project) => project.status !== 'archived' && belongsToRole(project, role));
            const trackedSeconds = roleTasks.reduce((total, task) => total + (task.trackedSeconds || 0), 0);

            return (
              <button className="role-card" key={role.id} onClick={() => onOpen(role)} type="button">
                <span className="role-card-accent" style={{ background: role.color }} />
                <span className="role-card-heading">
                  <strong>{role.title}</strong>
                  {role.status === 'archived' && <i>В архиве</i>}
                </span>
                <span className="role-identity">
                  {role.identity || 'Ориентир для этой сферы пока не добавлен'}
                </span>
                <span className="role-stats">
                  <i><strong>{activeTasks}</strong> активных задач</i>
                  <i><strong>{roleProjects.length}</strong> проектов</i>
                  <i><strong>{trackedSeconds > 0 ? formatTime(trackedSeconds) : '0 мин'}</strong> затрачено</i>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
