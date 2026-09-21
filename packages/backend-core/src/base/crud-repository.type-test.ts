import type { Prisma, Unit } from '@devloggers/db-prisma';
import { CrudRepository } from './crud-repository';

/**
 * Compile-time characterization of the repository seam.
 *
 * Deliberately not a `.spec.ts`: backend-core's Jest runs with `isolatedModules`
 * and transpiles without semantic diagnostics, so it would not enforce
 * `@ts-expect-error`. As a plain `.ts` file this is part of the package build
 * (`tsc`), which does enforce the assertions below. Nothing executes here —
 * the probe function is never called.
 */

declare const prismaUnit: Prisma.UnitDelegate;

class UnitProbeRepository extends CrudRepository<Unit, Prisma.UnitDelegate> {
  constructor() {
    super(prismaUnit);
  }
}

export function _typeChecks(repo: UnitProbeRepository): void {
  // Valid create/update inputs compile.
  void repo.create({ tenantId: 't', name: {}, abbreviation: 'kg' });
  void repo.update('id', { abbreviation: 'g' });

  // Valid filters compile.
  void repo.findMany('t', { where: { abbreviation: 'kg' }, orderBy: { createdAt: 'desc' } });
  void repo.exists('t', { abbreviation: 'kg' });

  // @ts-expect-error — Unit has no `code` field
  void repo.create({ tenantId: 't', name: {}, abbreviation: 'kg', code: 'x' });

  // @ts-expect-error — invalid filter field must not compile
  void repo.findMany('t', { where: { code: 'kg' } });

  // @ts-expect-error — invalid update field must not compile
  void repo.update('id', { nope: 1 });
}
