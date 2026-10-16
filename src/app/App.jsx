import { useCallback, useEffect, useState } from 'react';
import {
  listProjects,
  listRoles,
  listTasks,
  removeProject,
  removeRole,
  removeTask,
  saveProject,
  saveRole,
  saveTask,
  saveTimeEntry,
} from '../shared/storage/indexed-db.js';
import PomodoroCard from '../features/focus/components/PomodoroCard.jsx';
import ProjectEditor from '../features/projects/components/ProjectEditor.jsx';
import ProjectList from '../features/projects/components/ProjectList.jsx';
import RoleEditor from '../features/roles/components/RoleEditor.jsx';
import RoleList from '../features/roles/components/RoleList.jsx';
import TaskEditor from '../features/tasks/components/TaskEditor.jsx';
import TaskList from '../features/tasks/components/TaskList.jsx';
import { createProject, normalizeProject } from '../features/projects/model/project-model.js';
import { createRole, normalizeRole, ROLE_COLORS } from '../features/roles/model/role-model.js';
import veraLogo from '../assets/images/vera-logo.png';
import {
  calculateDailyPlannedMinutes,
  createTask,
  isTaskCompleted,
  localDateKey,
  normalizeTask,
  taskMatchesView,
} from '../features/tasks/model/task-model.js';

const NAV_ITEMS = [
  ['today', 'Сегодня'],
  ['inbox', 'Входящие'],
  ['tasks', 'Задачи'],
  ['projects', 'Проекты'],
  ['roles', 'Сферы жизни'],
  ['calendar', 'Календарь'],
  ['focus', 'Фокус'],
  ['habits', 'Привычки'],
  ['growth', 'Развитие'],
  ['journal', 'Дневник'],
  ['review', 'Обзор'],
];

const ENABLED_NAV_ITEMS = new Set(['today', 'inbox', 'tasks', 'projects', 'roles']);

const EXAMPLE_TASKS = [
  {
    id: 'example-plan',
    title: 'Наметить три главных результата дня',
    completed: false,
    area: 'Личное',
    estimate: 10,
    createdAt: '2026-10-15T07:00:00.000Z',
  },
  {
    id: 'example-walk',
    title: 'Прогулка без телефона',
    completed: false,
    area: 'Здоровье',
    estimate: 30,
    createdAt: '2026-10-15T07:01:00.000Z',
  },
];

function formatDate(date) {
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

function formatTime(date) {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function greetingForHour(hour) {
  if (hour < 12) return 'Доброе утро';
  if (hour < 18) return 'Добрый день';
  return 'Добрый вечер';
}

function Icon({ name }) {
  const paths = {
    today: 'M4 5.5h16M7 3v5m10-5v5M5 9h14v11H5z',
    inbox: 'M4 5h16v14H4zm0 9h5l1.5 2h3L15 14h5',
    tasks: 'm5 7 2 2 4-4m2 3h6M5 15l2 2 4-4m2 3h6',
    projects: 'M4 7h6l2 2h8v10H4zM4 7V5h6l2 2',
    roles: 'M12 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM6 20v-2a6 6 0 0 1 12 0v2M5 7a2 2 0 1 0 0 4m14-4a2 2 0 1 1 0 4',
    calendar: 'M5 6h14v14H5zM8 3v6m8-6v6M5 10h14',
    focus: 'M12 3a9 9 0 1 0 9 9M12 7v5l3 2',
    habits: 'M12 3c3 3 5 5 5 9a5 5 0 0 1-10 0c0-2 1-4 3-6 0 3 1 4 2 5 1-2 1-5 0-8z',
    growth: 'M5 19V9m7 10V5m7 14v-7M3 19h18',
    journal: 'M6 4h12v16H6zM9 8h6m-6 4h6m-6 4h4',
    review: 'M5 6h14M5 12h14M5 18h9m4 0 2 2 3-4',
    plus: 'M12 5v14M5 12h14',
    sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0-5v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4',
    check: 'm5 12 4 4L19 6',
    trash: 'M5 7h14m-9 4v5m4-5v5M8 7l1-3h6l1 3m1 0-1 13H8L7 7',
  };

  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

function App() {
  const [now, setNow] = useState(() => new Date());
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeNav, setActiveNav] = useState('today');
  const [taskFilter, setTaskFilter] = useState('active');
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [newTaskDraft, setNewTaskDraft] = useState(null);
  const [restoredTaskDraft, setRestoredTaskDraft] = useState(null);
  const [returnTaskDraft, setReturnTaskDraft] = useState(null);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [newProjectDraft, setNewProjectDraft] = useState(null);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [newRoleDraft, setNewRoleDraft] = useState(null);

  useEffect(() => {
    Promise.all([listTasks(), listProjects(), listRoles()])
      .then(async ([loadedTasks, storedProjects, storedRoles]) => {
        const storedTasks = loadedTasks.length ? loadedTasks : EXAMPLE_TASKS;
        const normalizedTasks = storedTasks.map((task) => normalizeTask(task));
        const normalizedProjects = storedProjects.map(normalizeProject);
        const normalizedRoles = storedRoles.map(normalizeRole);
        const uniqueRoles = [];
        const duplicateRoles = [];
        const canonicalRoleByTitle = new Map();
        normalizedRoles.forEach((role) => {
          const key = role.title.trim().toLocaleLowerCase('ru-RU');
          if (!key || !canonicalRoleByTitle.has(key)) {
            uniqueRoles.push(role);
            if (key) canonicalRoleByTitle.set(key, role);
          } else {
            duplicateRoles.push(role);
          }
        });
        const exampleTaskIds = new Set(EXAMPLE_TASKS.map((task) => task.id));
        const legacyRoleTitles = new Set([
          ...normalizedTasks.filter((task) => !exampleTaskIds.has(task.id)).map((task) => task.area),
          ...normalizedProjects.map((project) => project.area),
        ].filter((title) => title && title !== 'Без сферы'));
        const createdRoles = Array.from(legacyRoleTitles)
          .filter((title) => !canonicalRoleByTitle.has(title.toLocaleLowerCase('ru-RU')))
          .map((title, index) => ({
            ...createRole(title, ROLE_COLORS[(uniqueRoles.length + index) % ROLE_COLORS.length]),
            id: `legacy-area:${encodeURIComponent(title.trim().toLocaleLowerCase('ru-RU'))}`,
          }));
        const allRoles = [...uniqueRoles, ...createdRoles];
        const allRolesByTitle = new Map(allRoles.map((role) => [role.title.toLocaleLowerCase('ru-RU'), role]));
        const allRolesById = new Map(createdRoles.map((role) => [role.id, role]));
        normalizedRoles.forEach((role) => {
          allRolesById.set(role.id, allRolesByTitle.get(role.title.trim().toLocaleLowerCase('ru-RU')) || role);
        });
        const migratedTasks = normalizedTasks.map((task) => {
          const role = allRolesById.get(task.roleId)
            || allRolesByTitle.get(task.area?.toLocaleLowerCase('ru-RU'));
          return { ...task, roleId: role?.id || null, area: role?.title || 'Без сферы' };
        });
        const migratedProjects = normalizedProjects.map((project) => {
          const role = allRolesById.get(project.roleId)
            || allRolesByTitle.get(project.area?.toLocaleLowerCase('ru-RU'));
          return { ...project, roleId: role?.id || null, area: role?.title || 'Без сферы' };
        });
        const changedTasks = migratedTasks.filter((task, index) => JSON.stringify(task) !== JSON.stringify(storedTasks[index]));
        const changedProjects = migratedProjects.filter((project, index) => JSON.stringify(project) !== JSON.stringify(storedProjects[index]));
        const duplicateRoleIds = new Set(duplicateRoles.map((role) => role.id));
        const storedRoleById = new Map(storedRoles.map((role) => [role.id, role]));
        const changedRoles = uniqueRoles.filter((role) => (
          !duplicateRoleIds.has(role.id)
          && JSON.stringify(role) !== JSON.stringify(storedRoleById.get(role.id))
        ));
        await Promise.all([
          ...changedTasks.map(saveTask),
          ...changedProjects.map(saveProject),
          ...changedRoles.map(saveRole),
          ...createdRoles.map(saveRole),
          ...duplicateRoles.map((role) => removeRole(role.id)),
        ]);
        setTasks(migratedTasks);
        setProjects(migratedProjects);
        setRoles(allRoles);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(timerId);
  }, []);

  const handleFocusComplete = useCallback(async (session) => {
    const task = tasks.find((item) => item.id === session.taskId);
    const timeEntry = {
      id: crypto.randomUUID(),
      taskId: session.taskId,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      durationSeconds: session.durationSeconds,
      source: 'focus',
      practiceType: 'ordinary',
      createdAt: new Date().toISOString(),
    };

    if (!task) {
      await saveTimeEntry(timeEntry);
      return;
    }

    const updatedTask = {
      ...task,
      trackedSeconds: (task.trackedSeconds || 0) + session.durationSeconds,
    };

    await Promise.all([saveTimeEntry(timeEntry), saveTask(updatedTask)]);
    setTasks((current) => current.map((item) => (item.id === task.id ? updatedTask : item)));
  }, [tasks]);

  const todayKey = localDateKey(now);
  const todayTasks = tasks.filter((task) => taskMatchesView(task, 'today', 'active', todayKey));
  const completedCount = todayTasks.filter(isTaskCompleted).length;
  const plannedMinutes = calculateDailyPlannedMinutes(tasks, todayKey);
  const editingTask = newTaskDraft || restoredTaskDraft || tasks.find((task) => task.id === editingTaskId);
  const editingProject = newProjectDraft || projects.find((project) => project.id === editingProjectId);
  const editingRole = newRoleDraft || roles.find((role) => role.id === editingRoleId);

  async function addTask(title) {
    const task = createTask(title, activeNav, todayKey);
    await saveTask(task);
    setTasks((current) => [...current, task]);
  }

  function createDetailedTask(title = '') {
    setEditingTaskId(null);
    setRestoredTaskDraft(null);
    setReturnTaskDraft(null);
    setNewTaskDraft(createTask(title, activeNav, todayKey));
  }

  function openTaskEditor(task) {
    setNewTaskDraft(null);
    setRestoredTaskDraft(null);
    setReturnTaskDraft(null);
    setEditingTaskId(task.id);
  }

  function openSubtaskEditor(task, parentDraft) {
    setNewTaskDraft(null);
    setRestoredTaskDraft(null);
    setReturnTaskDraft(parentDraft);
    setEditingTaskId(task.id);
  }

  function returnToParentTask() {
    if (!returnTaskDraft) return;
    setNewTaskDraft(null);
    setRestoredTaskDraft(returnTaskDraft);
    setEditingTaskId(returnTaskDraft.id);
    setReturnTaskDraft(null);
  }

  function closeTaskEditor() {
    setNewTaskDraft(null);
    setRestoredTaskDraft(null);
    setReturnTaskDraft(null);
    setEditingTaskId(null);
  }

  function createNewProject() {
    setEditingProjectId(null);
    setNewProjectDraft(createProject());
  }

  function openProjectEditor(project) {
    setNewProjectDraft(null);
    setEditingProjectId(project.id);
  }

  function closeProjectEditor() {
    setNewProjectDraft(null);
    setEditingProjectId(null);
  }

  function createNewRole() {
    setEditingRoleId(null);
    setNewRoleDraft(createRole('', ROLE_COLORS[roles.length % ROLE_COLORS.length]));
  }

  function openRoleEditor(role) {
    setNewRoleDraft(null);
    setEditingRoleId(role.id);
  }

  function closeRoleEditor() {
    setNewRoleDraft(null);
    setEditingRoleId(null);
  }

  async function updateRole(role) {
    const linkedTasks = tasks.filter((task) => task.roleId === role.id);
    const linkedProjects = projects.filter((project) => project.roleId === role.id);
    const updatedTasks = linkedTasks.map((task) => ({ ...task, area: role.title, updatedAt: new Date().toISOString() }));
    const updatedProjects = linkedProjects.map((project) => ({ ...project, area: role.title, updatedAt: new Date().toISOString() }));
    const tasksById = new Map(updatedTasks.map((task) => [task.id, task]));
    const projectsById = new Map(updatedProjects.map((project) => [project.id, project]));
    await Promise.all([saveRole(role), ...updatedTasks.map(saveTask), ...updatedProjects.map(saveProject)]);
    setRoles((current) => (
      current.some((item) => item.id === role.id)
        ? current.map((item) => (item.id === role.id ? role : item))
        : [...current, role]
    ));
    setTasks((current) => current.map((task) => tasksById.get(task.id) || task));
    setProjects((current) => current.map((project) => projectsById.get(project.id) || project));
    closeRoleEditor();
  }

  async function deleteRole(role) {
    const updatedAt = new Date().toISOString();
    const detachedTasks = tasks
      .filter((task) => task.roleId === role.id)
      .map((task) => ({ ...task, roleId: null, area: 'Без сферы', updatedAt }));
    const detachedProjects = projects
      .filter((project) => project.roleId === role.id)
      .map((project) => ({ ...project, roleId: null, area: 'Без сферы', updatedAt }));
    const tasksById = new Map(detachedTasks.map((task) => [task.id, task]));
    const projectsById = new Map(detachedProjects.map((project) => [project.id, project]));
    await Promise.all([
      removeRole(role.id),
      ...detachedTasks.map(saveTask),
      ...detachedProjects.map(saveProject),
    ]);
    setRoles((current) => current.filter((item) => item.id !== role.id));
    setTasks((current) => current.map((task) => tasksById.get(task.id) || task));
    setProjects((current) => current.map((project) => projectsById.get(project.id) || project));
    closeRoleEditor();
  }

  async function updateProject(project) {
    await saveProject(project);
    setProjects((current) => (
      current.some((item) => item.id === project.id)
        ? current.map((item) => (item.id === project.id ? project : item))
        : [...current, project]
    ));
    closeProjectEditor();
  }

  async function deleteProject(project) {
    const linkedTasks = tasks.filter((task) => task.projectId === project.id);
    const updatedAt = new Date().toISOString();
    const detachedTasks = linkedTasks.map((task) => ({ ...task, projectId: null, updatedAt }));
    const detachedById = new Map(detachedTasks.map((task) => [task.id, task]));
    await Promise.all([removeProject(project.id), ...detachedTasks.map(saveTask)]);
    setProjects((current) => current.filter((item) => item.id !== project.id));
    setTasks((current) => current.map((task) => detachedById.get(task.id) || task));
    closeProjectEditor();
  }

  async function toggleTask(task) {
    const completed = isTaskCompleted(task);
    const updatedTask = {
      ...task,
      status: completed ? task.previousStatus || 'planned' : 'completed',
      previousStatus: completed ? task.previousStatus : task.status,
      completed: !completed,
      completedAt: completed ? null : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveTask(updatedTask);
    setTasks((current) => current.map((item) => (item.id === task.id ? updatedTask : item)));
  }

  async function deleteTaskTree(task) {
    const ids = new Set([task.id]);
    let foundChildren = true;
    while (foundChildren) {
      foundChildren = false;
      tasks.forEach((item) => {
        if (item.parentTaskId && ids.has(item.parentTaskId) && !ids.has(item.id)) {
          ids.add(item.id);
          foundChildren = true;
        }
      });
    }
    await Promise.all(Array.from(ids).map(removeTask));
    setTasks((current) => current.filter((item) => !ids.has(item.id)));
    if (returnTaskDraft && !ids.has(returnTaskDraft.id)) {
      returnToParentTask();
      return;
    }
    closeTaskEditor();
  }

  async function updateTask(task, manualTime = null) {
    let taskToSave = task;
    let manualTimeEntry = null;
    if (manualTime?.minutes > 0) {
      const durationSeconds = Math.round(manualTime.minutes * 60);
      const today = localDateKey();
      const endedAt = manualTime.date === today
        ? new Date()
        : new Date(`${manualTime.date}T12:00:00`);
      const safeEndedAt = Number.isNaN(endedAt.getTime()) ? new Date() : endedAt;
      const startedAt = new Date(safeEndedAt.getTime() - durationSeconds * 1_000);
      manualTimeEntry = {
        id: crypto.randomUUID(),
        taskId: task.id,
        startedAt: startedAt.toISOString(),
        endedAt: safeEndedAt.toISOString(),
        durationSeconds,
        source: 'manual',
        practiceType: 'ordinary',
        createdAt: new Date().toISOString(),
      };
      taskToSave = {
        ...task,
        trackedSeconds: (task.trackedSeconds || 0) + durationSeconds,
      };
    }

    await Promise.all([
      saveTask(taskToSave),
      ...(manualTimeEntry ? [saveTimeEntry(manualTimeEntry)] : []),
    ]);
    setTasks((current) => (
      current.some((item) => item.id === taskToSave.id)
        ? current.map((item) => (item.id === taskToSave.id ? taskToSave : item))
        : [...current, taskToSave]
    ));
    if (returnTaskDraft && taskToSave.parentTaskId === returnTaskDraft.id) {
      returnToParentTask();
      return;
    }
    closeTaskEditor();
  }

  async function addSubtask(parent, title) {
    const subtask = normalizeTask({
      id: crypto.randomUUID(),
      parentTaskId: parent.id,
      title,
      status: 'planned',
      completed: false,
      area: parent.area,
      roleId: parent.roleId,
      projectId: parent.projectId,
      scheduledDate: parent.scheduledDate,
      dueDate: parent.dueDate,
      estimate: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await saveTask(subtask);
    setTasks((current) => [...current, subtask]);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#top" aria-label="Вера — на главную">
          <span className="brand-logo-crop" aria-hidden="true">
            <img className="brand-logo-image" src={veraLogo} alt="" />
          </span>
        </a>

        <nav aria-label="Основная навигация">
          {NAV_ITEMS.map(([id, label]) => (
            <button
              className={`nav-item ${id === activeNav ? 'active' : ''}`}
              key={id}
              disabled={!ENABLED_NAV_ITEMS.has(id)}
              onClick={() => setActiveNav(id)}
              title={ENABLED_NAV_ITEMS.has(id) ? undefined : 'Появится в следующих этапах'}
              type="button"
            >
              <Icon name={id} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-note">
          <span className="eyebrow">Хранение</span>
          <strong>На этом устройстве</strong>
          <span>Данные доступны офлайн</span>
        </div>
      </aside>

      <main id="top">
        <header className="topbar">
          <div className="mobile-brand" aria-label="Vera">
            <span className="brand-logo-crop" aria-hidden="true">
              <img className="brand-logo-image" src={veraLogo} alt="" />
            </span>
          </div>
          <div className="topbar-tools">
            <PomodoroCard compact tasks={tasks} onFocusComplete={handleFocusComplete} />
            <button className="avatar" type="button" aria-label="Открыть профиль">А</button>
          </div>
        </header>

        <nav className="mobile-nav" aria-label="Разделы задач">
          {NAV_ITEMS.filter(([id]) => ENABLED_NAV_ITEMS.has(id)).map(([id, label]) => (
            <button
              className={id === activeNav ? 'active' : ''}
              key={id}
              onClick={() => setActiveNav(id)}
              type="button"
            >
              <Icon name={id} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="content">
          {activeNav === 'today' ? (
            <section className="day-header" aria-labelledby="day-title">
            <div>
              <h1 id="day-title">{greetingForHour(now.getHours())}</h1>
              <div className="day-meta">
                <time className="eyebrow" dateTime={now.toISOString().slice(0, 10)}>
                  {formatDate(now)}
                </time>
                <span aria-hidden="true">·</span>
                <time
                  className="digital-clock"
                  dateTime={formatTime(now)}
                  aria-label={`Текущее время ${formatTime(now)}`}
                >
                  <span aria-hidden="true">{formatTime(now).slice(0, 2)}</span>
                  <span
                    aria-hidden="true"
                    className={`clock-separator ${now.getSeconds() % 2 ? 'dimmed' : ''}`}
                  >
                    :
                  </span>
                  <span aria-hidden="true">{formatTime(now).slice(-2)}</span>
                </time>
              </div>
            </div>
            <button className="ritual-button" type="button">
              <Icon name="sun" />
              <span>
                Спланировать день
                <small>3–5 минут</small>
              </span>
            </button>
            </section>
          ) : activeNav === 'projects' ? (
            <section className="module-header">
              <div className="module-header-copy">
                <span className="eyebrow">Структура действий</span>
                <h1>Проекты</h1>
                <p>Собирайте связанные задачи вокруг одного конкретного результата.</p>
              </div>
              <button className="new-task-button" onClick={createNewProject} type="button">
                Добавить проект
              </button>
            </section>
          ) : activeNav === 'roles' ? (
            <section className="module-header">
              <div className="module-header-copy">
                <span className="eyebrow">Баланс жизни</span>
                <h1>Сферы жизни</h1>
                <p>Соберите важные части своей жизни и связывайте с ними задачи, проекты и время в фокусе.</p>
              </div>
              <button className="new-task-button" onClick={createNewRole} type="button">
                Добавить сферу
              </button>
            </section>
          ) : (
            <section className="module-header">
              <div className="module-header-copy">
                <span className="eyebrow">Задачи</span>
                <h1>{activeNav === 'inbox' ? 'Входящие' : 'Все задачи'}</h1>
                <p>
                  {activeNav === 'inbox'
                    ? 'Сначала зафиксируйте мысль. Разобрать и запланировать её можно позже.'
                    : 'Единое место для запланированных, будущих и завершённых задач.'}
                </p>
              </div>
              <button className="new-task-button" onClick={() => createDetailedTask()} type="button">
                Добавить задачу
              </button>
            </section>
          )}

          {activeNav === 'today' ? (
            <div className="dashboard-grid">
            <section className="primary-column">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">План дня</span>
                  <h2>Сегодня</h2>
                </div>
                <div className="plan-summary">
                  <button className="new-task-button" onClick={() => createDetailedTask()} type="button">
                    Добавить задачу
                  </button>
                  <span className="quiet-stat">{plannedMinutes} мин запланировано</span>
                </div>
              </div>

              <TaskList
                tasks={tasks}
                projects={projects}
                roles={roles}
                view="today"
                filter="active"
                onFilterChange={setTaskFilter}
                onAdd={addTask}
                onToggle={toggleTask}
                onOpen={openTaskEditor}
                isLoading={isLoading}
              />
            </section>

            <aside className="secondary-column">
              <section className="check-in-card">
                <div className="section-heading compact">
                  <div>
                    <span className="eyebrow">Текущий статус</span>
                    <h2>Уже сделано</h2>
                  </div>
                  <strong className="score">{completedCount}</strong>
                </div>
                <p>Каждое завершённое действие — свидетельство движения, а не оценка дня.</p>
                <button className="text-button" type="button">Записать маленькую победу →</button>
              </section>
            </aside>
            </div>
          ) : activeNav === 'projects' ? (
            <div className="projects-page">
              <ProjectList projects={projects} tasks={tasks} roles={roles} onOpen={openProjectEditor} />
            </div>
          ) : activeNav === 'roles' ? (
            <div className="roles-page">
              <RoleList roles={roles} tasks={tasks} projects={projects} onOpen={openRoleEditor} />
            </div>
          ) : (
            <div className="tasks-page">
              <TaskList
                tasks={tasks}
                projects={projects}
                roles={roles}
                view={activeNav}
                filter={taskFilter}
                onFilterChange={setTaskFilter}
                onAdd={addTask}
                onToggle={toggleTask}
                onOpen={openTaskEditor}
                isLoading={isLoading}
              />
            </div>
          )}
        </div>
      </main>
      {editingTask && (
        <TaskEditor
          task={editingTask}
          tasks={tasks}
          projects={projects}
          roles={roles}
          parentTask={returnTaskDraft}
          isNew={Boolean(newTaskDraft)}
          onBack={returnToParentTask}
          onClose={closeTaskEditor}
          onOpenTask={openSubtaskEditor}
          onDelete={deleteTaskTree}
          onSave={updateTask}
          onAddSubtask={addSubtask}
        />
      )}
      {editingProject && (
        <ProjectEditor
          project={editingProject}
          projects={projects}
          tasks={tasks}
          roles={roles}
          isNew={Boolean(newProjectDraft)}
          onClose={closeProjectEditor}
          onDelete={deleteProject}
          onSave={updateProject}
        />
      )}
      {editingRole && (
        <RoleEditor
          role={editingRole}
          roles={roles}
          tasks={tasks}
          projects={projects}
          isNew={Boolean(newRoleDraft)}
          onClose={closeRoleEditor}
          onDelete={deleteRole}
          onSave={updateRole}
        />
      )}
    </div>
  );
}

export default App;
