import { describe, expect, it } from 'vitest';
import { loadTaskOptions } from './task-option-source.js';

function makeTasks(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `task-${index}`,
    title: `Задача ${String(index).padStart(2, '0')}`,
    status: 'planned',
  }));
}

describe('task option source', () => {
  it('returns task options in pages of 20', async () => {
    const tasks = makeTasks(25);
    const firstPage = await loadTaskOptions({ tasks, limit: 20 });
    const secondPage = await loadTaskOptions({ tasks, offset: 20, limit: 20 });

    expect(firstPage.items).toHaveLength(20);
    expect(firstPage.hasMore).toBe(true);
    expect(secondPage.items).toHaveLength(5);
    expect(secondPage.hasMore).toBe(false);
  });

  it('filters by text and excludes unsafe parent candidates', async () => {
    const tasks = [
      { id: '1', title: 'Подготовить доклад', status: 'planned' },
      { id: '2', title: 'Доклад: собрать материалы', status: 'planned' },
      { id: '3', title: 'Позвонить', status: 'planned' },
    ];
    const result = await loadTaskOptions({ tasks, query: 'доклад', excludedIds: new Set(['2']) });

    expect(result.items).toEqual([{ value: '1', label: 'Подготовить доклад' }]);
  });

  it('respects an aborted request', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(loadTaskOptions({ tasks: makeTasks(2), signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
  });
});
