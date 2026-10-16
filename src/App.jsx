import { useCallback, useEffect, useState } from 'react';
import { listTasks, removeTask, saveTask, saveTimeEntry } from './db.js';
import PomodoroCard from './PomodoroCard.jsx';
import TaskEditor from './TaskEditor.jsx';
import TaskList from './TaskList.jsx';
import {
  createTask,
  isTaskCompleted,
  localDateKey,
  normalizeTask,
  taskMatchesView,
} from './task-model.js';

const NAV_ITEMS = [
  ['today', 'Сегодня'],
  ['inbox', 'Входящие'],
  ['tasks', 'Задачи'],
  ['calendar', 'Календарь'],
  ['focus', 'Фокус'],
  ['habits', 'Привычки'],
  ['growth', 'Развитие'],
  ['journal', 'Дневник'],
  ['review', 'Обзор'],
];

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
  const [isLoading, setIsLoading] = useState(true);
  const [activeNav, setActiveNav] = useState('today');
  const [taskFilter, setTaskFilter] = useState('active');
  const [editingTaskId, setEditingTaskId] = useState(null);

  useEffect(() => {
    listTasks()
      .then(async (storedTasks) => {
        if (storedTasks.length) return storedTasks;
        await Promise.all(EXAMPLE_TASKS.map(saveTask));
        return EXAMPLE_TASKS;
      })
      .then(async (storedTasks) => {
        const normalizedTasks = storedTasks.map((task) => normalizeTask(task));
        const changedTasks = normalizedTasks.filter((task, index) => (
          JSON.stringify(task) !== JSON.stringify(storedTasks[index])
        ));
        if (changedTasks.length) await Promise.all(changedTasks.map(saveTask));
        setTasks(normalizedTasks);
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
  const plannedMinutes = todayTasks
    .filter((task) => !isTaskCompleted(task))
    .reduce((total, task) => total + (task.estimate || 0), 0);
  const editingTask = tasks.find((task) => task.id === editingTaskId);

  async function addTask(title) {
    const task = createTask(title, activeNav, todayKey);
    await saveTask(task);
    setTasks((current) => [...current, task]);
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
    setEditingTaskId(null);
  }

  async function updateTask(task) {
    await saveTask(task);
    setTasks((current) => current.map((item) => (item.id === task.id ? task : item)));
    setEditingTaskId(null);
  }

  async function addSubtask(parent, title) {
    const subtask = normalizeTask({
      id: crypto.randomUUID(),
      parentTaskId: parent.id,
      title,
      status: 'planned',
      completed: false,
      area: parent.area,
      scheduledDate: parent.scheduledDate,
      dueDate: parent.dueDate,
      estimate: 15,
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
          <span className="brand-mark">В</span>
          <span>вера</span>
        </a>

        <nav aria-label="Основная навигация">
          {NAV_ITEMS.map(([id, label]) => (
            <button
              className={`nav-item ${id === activeNav ? 'active' : ''}`}
              key={id}
              disabled={!['today', 'inbox', 'tasks'].includes(id)}
              onClick={() => setActiveNav(id)}
              title={['today', 'inbox', 'tasks'].includes(id) ? undefined : 'Появится в следующих этапах'}
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
          <div className="mobile-brand" aria-label="Текущий раздел">
            <span className="brand-mark">В</span>
            <span>{NAV_ITEMS.find(([id]) => id === activeNav)?.[1]}</span>
          </div>
          <button className="avatar" type="button" aria-label="Открыть профиль">А</button>
        </header>

        <nav className="mobile-nav" aria-label="Разделы задач">
          {NAV_ITEMS.slice(0, 3).map(([id, label]) => (
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
          ) : (
            <section className="module-header">
              <span className="eyebrow">Задачи</span>
              <h1>{activeNav === 'inbox' ? 'Входящие' : 'Все задачи'}</h1>
              <p>
                {activeNav === 'inbox'
                  ? 'Сначала зафиксируйте мысль. Разобрать и запланировать её можно позже.'
                  : 'Единое место для запланированных, будущих и завершённых задач.'}
              </p>
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
                <span className="quiet-stat">{plannedMinutes} мин запланировано</span>
              </div>

              <TaskList
                tasks={tasks}
                view="today"
                filter="active"
                onFilterChange={setTaskFilter}
                onAdd={addTask}
                onToggle={toggleTask}
                onOpen={(task) => setEditingTaskId(task.id)}
                isLoading={isLoading}
              />
            </section>

            <aside className="secondary-column">
              <PomodoroCard tasks={tasks} onFocusComplete={handleFocusComplete} />

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
          ) : (
            <div className="tasks-page">
              <TaskList
                tasks={tasks}
                view={activeNav}
                filter={taskFilter}
                onFilterChange={setTaskFilter}
                onAdd={addTask}
                onToggle={toggleTask}
                onOpen={(task) => setEditingTaskId(task.id)}
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
          onClose={() => setEditingTaskId(null)}
          onOpenTask={(task) => setEditingTaskId(task.id)}
          onDelete={deleteTaskTree}
          onSave={updateTask}
          onAddSubtask={addSubtask}
        />
      )}
    </div>
  );
}

export default App;
