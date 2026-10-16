function abortError() {
  return new DOMException('Request aborted', 'AbortError');
}

export async function loadTaskOptions({ tasks, excludedIds = new Set(), query = '', offset = 0, limit = 20, signal }) {
  await Promise.resolve();
  if (signal?.aborted) throw abortError();

  const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU');
  const matchingTasks = tasks
    .filter((task) => task.status !== 'cancelled' && !excludedIds.has(task.id))
    .filter((task) => !normalizedQuery || task.title.toLocaleLowerCase('ru-RU').includes(normalizedQuery))
    .sort((first, second) => first.title.localeCompare(second.title, 'ru-RU'));

  if (signal?.aborted) throw abortError();
  return {
    items: matchingTasks.slice(offset, offset + limit).map((task) => ({ value: task.id, label: task.title })),
    hasMore: offset + limit < matchingTasks.length,
  };
}
