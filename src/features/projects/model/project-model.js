export const PROJECT_STATUSES = [
  { value: 'active', label: 'Активный' },
  { value: 'paused', label: 'На паузе' },
  { value: 'completed', label: 'Завершён' },
  { value: 'archived', label: 'В архиве' },
];

export function normalizeProject(project) {
  return {
    title: '',
    description: '',
    status: 'active',
    area: 'Без сферы',
    targetDate: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...project,
    area: project.area || 'Без сферы',
  };
}

export function createProject(title = '') {
  const now = new Date().toISOString();
  return normalizeProject({
    id: crypto.randomUUID(),
    title: title.trim(),
    createdAt: now,
    updatedAt: now,
  });
}

export function isProjectOpen(project) {
  return project.status === 'active' || project.status === 'paused';
}
