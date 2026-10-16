import { describe, expect, it } from 'vitest';
import { createProject, isProjectOpen, normalizeProject } from './project-model.js';

describe('project model', () => {
  it('creates an active project without a forced sphere or target date', () => {
    const project = createProject('Запуск приложения');
    expect(project).toMatchObject({
      title: 'Запуск приложения',
      status: 'active',
      area: 'Без сферы',
      targetDate: '',
    });
  });

  it('distinguishes open and closed projects', () => {
    expect(isProjectOpen(normalizeProject({ status: 'paused' }))).toBe(true);
    expect(isProjectOpen(normalizeProject({ status: 'completed' }))).toBe(false);
  });
});
