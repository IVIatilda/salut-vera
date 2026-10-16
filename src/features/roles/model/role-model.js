export const ROLE_STATUSES = [
  { value: 'active', label: 'Активная' },
  { value: 'archived', label: 'В архиве' },
];

export const ROLE_COLORS = [
  '#4bbfa5',
  '#ff6b63',
  '#6f8edb',
  '#d9a441',
  '#9a72cf',
  '#4d9bbf',
  '#cc708e',
  '#718096',
];

export const LIFE_AREA_SUGGESTIONS = [
  'Работа',
  'Семья',
  'Здоровье',
  'Дружба',
  'Финансы',
  'Отдых',
  'Творчество',
  'Обучение',
  'Дом',
  'Личное развитие',
];

export function normalizeRole(role) {
  const now = new Date().toISOString();
  return {
    title: '',
    identity: '',
    color: ROLE_COLORS[0],
    status: 'active',
    createdAt: now,
    updatedAt: now,
    ...role,
    color: ROLE_COLORS.includes(role.color) ? role.color : ROLE_COLORS[0],
    status: role.status === 'archived' ? 'archived' : 'active',
  };
}

export function createRole(title = '', color = ROLE_COLORS[0]) {
  const now = new Date().toISOString();
  return normalizeRole({
    id: crypto.randomUUID(),
    title: title.trim(),
    color,
    createdAt: now,
    updatedAt: now,
  });
}

export function isRoleActive(role) {
  return role.status === 'active';
}
