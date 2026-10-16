import { useState } from 'react';
import { isProjectOpen } from '../model/project-model.js';
import { isTaskCompleted } from '../../tasks/model/task-model.js';

const FILTERS = [
  ['open', 'Открытые'],
  ['all', 'Все'],
  ['completed', 'Завершённые'],
];

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(`${value}T12:00:00`));
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`;
}

export default function ProjectList({ projects, tasks, onOpen }) {
  const [filter, setFilter] = useState('open');
  const visibleProjects = projects.filter((project) => {
    if (filter === 'completed') return project.status === 'completed';
    if (filter === 'open') return isProjectOpen(project);
    return true;
  });

  return (
    <section className="projects-panel">
      <div className="task-filters" aria-label="Фильтры проектов">
        {FILTERS.map(([id, label]) => (
          <button className={filter === id ? 'active' : ''} key={id} onClick={() => setFilter(id)} type="button">
            {label}
          </button>
        ))}
      </div>

      {visibleProjects.length === 0 ? (
        <div className="projects-empty">
          <strong>{filter === 'open' ? 'Открытых проектов пока нет' : 'В этой подборке проектов нет'}</strong>
          <span>Проект объединяет задачи, ведущие к одному конкретному результату.</span>
        </div>
      ) : (
        <div className="project-grid">
          {visibleProjects.map((project) => {
            const projectTasks = tasks.filter((task) => task.projectId === project.id && task.status !== 'cancelled');
            const completed = projectTasks.filter(isTaskCompleted).length;
            const progress = projectTasks.length ? Math.round((completed / projectTasks.length) * 100) : 0;
            const trackedSeconds = projectTasks.reduce((total, task) => total + (task.trackedSeconds || 0), 0);

            return (
              <button className="project-card" key={project.id} onClick={() => onOpen(project)} type="button">
                <span className={`project-status ${project.status}`}>
                  {project.status === 'active' ? 'Активный' : project.status === 'paused' ? 'На паузе' : project.status === 'completed' ? 'Завершён' : 'В архиве'}
                </span>
                <strong>{project.title}</strong>
                {project.description && <p>{project.description}</p>}
                <span className="project-card-meta">
                  {project.area !== 'Без сферы' && <i>{project.area}</i>}
                  {project.targetDate && <i>до {formatDate(project.targetDate)}</i>}
                  {trackedSeconds > 0 && <i>{formatTime(trackedSeconds)} в фокусе</i>}
                </span>
                <span className="project-progress-copy">
                  <i>{completed} из {projectTasks.length} задач</i>
                  <i>{progress}%</i>
                </span>
                <span className="project-progress"><i style={{ width: `${progress}%` }} /></span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
