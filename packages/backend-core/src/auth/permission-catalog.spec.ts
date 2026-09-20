import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_CATALOG,
  PERMISSION_GROUPS,
} from '@devloggers/api-contracts';

describe('permission catalog integrity', () => {
  it('has unique permission keys', () => {
    expect(new Set(ALL_PERMISSIONS).size).toBe(ALL_PERMISSIONS.length);
  });

  it('uses the resource.action format with a known resource', () => {
    const resources = Object.keys(PERMISSION_CATALOG);
    for (const key of ALL_PERMISSIONS) {
      const [resource, action, ...rest] = key.split('.');
      expect(rest).toHaveLength(0);
      expect(resources).toContain(resource);
      expect(action.length).toBeGreaterThan(0);
    }
  });

  it('places every catalog resource in exactly one UI group', () => {
    const grouped = Object.values(PERMISSION_GROUPS).flat();
    for (const resource of Object.keys(PERMISSION_CATALOG)) {
      expect(grouped.filter((candidate) => candidate === resource)).toHaveLength(1);
    }
  });

  it('grants only catalogued permissions in default roles', () => {
    for (const [role, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      for (const permission of permissions) {
        expect(ALL_PERMISSIONS).toContain(permission);
      }
      if (new Set(permissions).size !== permissions.length) {
        throw new Error(`${role} has duplicate grants`);
      }
      expect(new Set(permissions).size).toBe(permissions.length);
    }
  });

  it('separates posting from reversal in default roles (separation of duties)', () => {
    const accountant = DEFAULT_ROLE_PERMISSIONS.Accountant;
    expect(accountant).toContain('journals.post');
    expect(accountant).not.toContain('journals.reverse');
    expect(DEFAULT_ROLE_PERMISSIONS.Owner).toContain('journals.reverse');
    expect(DEFAULT_ROLE_PERMISSIONS.Owner).toContain('periods.close');
    expect(DEFAULT_ROLE_PERMISSIONS.Owner).toContain('openingBalances.manage');
  });
});
