const DB_NAME = 'vera-organizer';
const DB_VERSION = 2;
const TASK_STORE = 'tasks';
const TIME_ENTRY_STORE = 'timeEntries';

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
