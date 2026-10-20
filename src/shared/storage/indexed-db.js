const DB_NAME = 'vera-organizer';
const DB_VERSION = 8;
const TASK_STORE = 'tasks';
const TIME_ENTRY_STORE = 'timeEntries';
const PROJECT_STORE = 'projects';
const ROLE_STORE = 'roles';
const HABIT_STORE = 'habits';
const HABIT_LOG_STORE = 'habitLogs';
const IMPORTANT_DATE_STORE = 'importantDates';
const RITUAL_SESSION_STORE = 'ritualSessions';
const DAILY_PRIORITY_STORE = 'dailyPriorities';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(TASK_STORE)) {
        const taskStore = database.createObjectStore(TASK_STORE, { keyPath: 'id' });
        taskStore.createIndex('createdAt', 'createdAt');
      }

      if (!database.objectStoreNames.contains(TIME_ENTRY_STORE)) {
        const timeEntryStore = database.createObjectStore(TIME_ENTRY_STORE, { keyPath: 'id' });
        timeEntryStore.createIndex('taskId', 'taskId');
        timeEntryStore.createIndex('startedAt', 'startedAt');
      }

      if (!database.objectStoreNames.contains(PROJECT_STORE)) {
        const projectStore = database.createObjectStore(PROJECT_STORE, { keyPath: 'id' });
        projectStore.createIndex('createdAt', 'createdAt');
        projectStore.createIndex('status', 'status');
      }

      if (!database.objectStoreNames.contains(ROLE_STORE)) {
        const roleStore = database.createObjectStore(ROLE_STORE, { keyPath: 'id' });
        roleStore.createIndex('createdAt', 'createdAt');
        roleStore.createIndex('status', 'status');
      }

      if (!database.objectStoreNames.contains(HABIT_STORE)) {
        const habitStore = database.createObjectStore(HABIT_STORE, { keyPath: 'id' });
        habitStore.createIndex('createdAt', 'createdAt');
        habitStore.createIndex('status', 'status');
        habitStore.createIndex('roleId', 'roleId');
      }

      if (!database.objectStoreNames.contains(HABIT_LOG_STORE)) {
        const habitLogStore = database.createObjectStore(HABIT_LOG_STORE, { keyPath: 'id' });
        habitLogStore.createIndex('habitId', 'habitId');
        habitLogStore.createIndex('occurredOn', 'occurredOn');
        habitLogStore.createIndex('occurredAt', 'occurredAt');
      } else {
        const habitLogStore = request.transaction.objectStore(HABIT_LOG_STORE);
        if (!habitLogStore.indexNames.contains('occurredAt')) {
          habitLogStore.createIndex('occurredAt', 'occurredAt');
        }
      }

      if (!database.objectStoreNames.contains(IMPORTANT_DATE_STORE)) {
        const importantDateStore = database.createObjectStore(IMPORTANT_DATE_STORE, { keyPath: 'id' });
        importantDateStore.createIndex('date', 'date');
        importantDateStore.createIndex('createdAt', 'createdAt');
      }

      if (!database.objectStoreNames.contains(RITUAL_SESSION_STORE)) {
        const ritualSessionStore = database.createObjectStore(RITUAL_SESSION_STORE, { keyPath: 'id' });
        ritualSessionStore.createIndex('sessionDate', 'sessionDate');
        ritualSessionStore.createIndex('type', 'type');
      }

      if (!database.objectStoreNames.contains(DAILY_PRIORITY_STORE)) {
        const dailyPriorityStore = database.createObjectStore(DAILY_PRIORITY_STORE, { keyPath: 'id' });
        dailyPriorityStore.createIndex('priorityDate', 'priorityDate');
        dailyPriorityStore.createIndex('taskId', 'taskId');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runTransaction(storeName, mode, action) {
  return openDatabase().then(
    (database) =>
      new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const request = action(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => database.close();
      }),
  );
}

export function listTasks() {
  return runTransaction(TASK_STORE, 'readonly', (store) => store.getAll()).then((tasks) =>
    tasks.sort((first, second) => first.createdAt.localeCompare(second.createdAt)),
  );
}

export function saveTask(task) {
  return runTransaction(TASK_STORE, 'readwrite', (store) => store.put(task));
}

export function removeTask(taskId) {
  return runTransaction(TASK_STORE, 'readwrite', (store) => store.delete(taskId));
}

export function listTimeEntries() {
  return runTransaction(TIME_ENTRY_STORE, 'readonly', (store) => store.getAll());
}

export function saveTimeEntry(timeEntry) {
  return runTransaction(TIME_ENTRY_STORE, 'readwrite', (store) => store.put(timeEntry));
}

export function listProjects() {
  return runTransaction(PROJECT_STORE, 'readonly', (store) => store.getAll()).then((projects) =>
    projects.sort((first, second) => first.createdAt.localeCompare(second.createdAt)),
  );
}

export function saveProject(project) {
  return runTransaction(PROJECT_STORE, 'readwrite', (store) => store.put(project));
}

export function removeProject(projectId) {
  return runTransaction(PROJECT_STORE, 'readwrite', (store) => store.delete(projectId));
}

export function listRoles() {
  return runTransaction(ROLE_STORE, 'readonly', (store) => store.getAll()).then((roles) =>
    roles.sort((first, second) => first.createdAt.localeCompare(second.createdAt)),
  );
}

export function saveRole(role) {
  return runTransaction(ROLE_STORE, 'readwrite', (store) => store.put(role));
}

export function removeRole(roleId) {
  return runTransaction(ROLE_STORE, 'readwrite', (store) => store.delete(roleId));
}

export function listHabits() {
  return runTransaction(HABIT_STORE, 'readonly', (store) => store.getAll()).then((habits) =>
    habits.sort((first, second) => first.createdAt.localeCompare(second.createdAt)),
  );
}

export function saveHabit(habit) {
  return runTransaction(HABIT_STORE, 'readwrite', (store) => store.put(habit));
}

export function removeHabit(habitId) {
  return runTransaction(HABIT_STORE, 'readwrite', (store) => store.delete(habitId));
}

export function listHabitLogs() {
  return runTransaction(HABIT_LOG_STORE, 'readonly', (store) => store.getAll());
}

export function saveHabitLog(log) {
  return runTransaction(HABIT_LOG_STORE, 'readwrite', (store) => store.put(log));
}

export function removeHabitLog(logId) {
  return runTransaction(HABIT_LOG_STORE, 'readwrite', (store) => store.delete(logId));
}

export function listImportantDates() {
  return runTransaction(IMPORTANT_DATE_STORE, 'readonly', (store) => store.getAll()).then((items) =>
    items.sort((first, second) => first.date.localeCompare(second.date)),
  );
}

export function saveImportantDate(item) {
  return runTransaction(IMPORTANT_DATE_STORE, 'readwrite', (store) => store.put(item));
}

export function removeImportantDate(itemId) {
  return runTransaction(IMPORTANT_DATE_STORE, 'readwrite', (store) => store.delete(itemId));
}

export function listRitualSessions() {
  return runTransaction(RITUAL_SESSION_STORE, 'readonly', (store) => store.getAll());
}

export function saveRitualSession(session) {
  return runTransaction(RITUAL_SESSION_STORE, 'readwrite', (store) => store.put(session));
}

export function listDailyPriorities() {
  return runTransaction(DAILY_PRIORITY_STORE, 'readonly', (store) => store.getAll());
}

export function saveDailyPriority(priority) {
  return runTransaction(DAILY_PRIORITY_STORE, 'readwrite', (store) => store.put(priority));
}

export function removeDailyPriority(priorityId) {
  return runTransaction(DAILY_PRIORITY_STORE, 'readwrite', (store) => store.delete(priorityId));
}
