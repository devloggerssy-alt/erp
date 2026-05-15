import { Injectable } from '@nestjs/common';
import { CrudPresenter } from '@devloggers/backend-core';
import type { Unit } from '@devloggers/db-prisma';
import { UnitResponseDto } from '../dto';

/**
 * Unit presenter — maps a Prisma `Unit` entity to the public `UnitResponseDto`.
 *
 * This is the only place that knows the shape of both the DB entity
 * and the API response. If the DB schema changes (e.g. a column rename),
 * only this file needs updating — controllers and services stay clean.
 */
@Injectable()
export class UnitPresenter extends CrudPresenter<Unit, UnitResponseDto> {
  toResponse(entity: Unit): UnitResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      abbreviation: entity.abbreviation,
      isActive: entity.isActive,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
