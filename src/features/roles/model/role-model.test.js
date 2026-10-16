import { describe, expect, it } from 'vitest';
import { createRole, isRoleActive, LIFE_AREA_SUGGESTIONS, normalizeRole, ROLE_COLORS } from './role-model.js';

describe('role model', () => {
  it('creates an active role with an identity statement', () => {
    const role = createRole('Профессионал', ROLE_COLORS[2]);
    expect(role).toMatchObject({
      title: 'Профессионал',
      identity: '',
      color: ROLE_COLORS[2],
      status: 'active',
    });
  });

  it('normalizes unsupported colors and statuses', () => {
    const role = normalizeRole({ color: '#000000', status: 'unknown' });
    expect(role.color).toBe(ROLE_COLORS[0]);
    expect(isRoleActive(role)).toBe(true);
  });

  it('recognizes archived roles', () => {
    expect(isRoleActive(normalizeRole({ status: 'archived' }))).toBe(false);
  });

  it('provides unique optional life area suggestions', () => {
    expect(LIFE_AREA_SUGGESTIONS).toContain('Здоровье');
    expect(new Set(LIFE_AREA_SUGGESTIONS).size).toBe(LIFE_AREA_SUGGESTIONS.length);
  });
});
