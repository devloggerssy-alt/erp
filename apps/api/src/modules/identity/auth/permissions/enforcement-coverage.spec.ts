import { readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { ALL_PERMISSIONS, type PermissionKey } from '@devloggers/api-contracts';

/** Controllers intentionally exempt from the checks below. */
const ALLOWLIST = new Set([
  // Public login/register/logout + authenticated-only /auth/me.
  'auth.controller.ts',
  // Authenticated-only GET /settings/defaults — every signed-in user needs
  // form pre-fill defaults, so it deliberately has no permission gate.
  'form-defaults.controller.ts',
  // Public POST /tenants; its two other routes are asserted in factory-permission-metadata.spec.ts.
  'tenants.controller.ts',
]);

const SRC_DIR = join(__dirname, '..', '..', '..', '..');

function collectControllers(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') return [];
      return collectControllers(fullPath);
    }
    return entry.name.endsWith('.controller.ts') ? [fullPath] : [];
  });
}

const controllers = collectControllers(SRC_DIR);

describe('authorization enforcement coverage', () => {
  it('discovers all API controllers', () => {
    expect(controllers.length).toBeGreaterThanOrEqual(45);
  });

  it.each(controllers)('%s uses PermissionsGuard', (file) => {
    if (ALLOWLIST.has(basename(file))) return;
    const content = readFileSync(file, 'utf8');
    if (!content.includes('JwtAuthGuard')) return; // controller is public by design
    if (!content.includes('PermissionsGuard')) {
      throw new Error(`${basename(file)} is missing PermissionsGuard`);
    }
  });

  it.each(controllers)('%s declares permission metadata for every route', (file) => {
    if (ALLOWLIST.has(basename(file))) return;
    const content = readFileSync(file, 'utf8');
    const usesFactory =
      content.includes('createCrudController(') || content.includes('createCrudImportExportController(');

    if (usesFactory) {
      if (!content.includes('permissions:')) {
        throw new Error(`${basename(file)} factory config is missing permissions`);
      }
      return;
    }

    const routeDecorators = content.match(/@(Get|Post|Patch|Delete|Put)\(/g) ?? [];
    const requireDecorators = content.match(/@RequirePermission\(/g) ?? [];
    if (requireDecorators.length < routeDecorators.length) {
      throw new Error(
        `${basename(file)} has ${routeDecorators.length} routes but ${requireDecorators.length} @RequirePermission decorators`,
      );
    }
  });

  it.each(controllers)('%s references only catalogued permission codes', (file) => {
    const content = readFileSync(file, 'utf8');
    const codes = [
      ...content.matchAll(/@RequirePermission\(\s*'([^']+)'/g),
      ...content.matchAll(/(?:view|create|update|delete):\s*'([^']+)'/g),
    ].map((match) => match[1]);
    for (const code of codes) {
      if (!ALL_PERMISSIONS.includes(code as PermissionKey)) {
        throw new Error(`${basename(file)} uses unknown permission ${code}`);
      }
    }
  });
});
