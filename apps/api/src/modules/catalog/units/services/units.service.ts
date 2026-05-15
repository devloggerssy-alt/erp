import { Injectable, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrudService } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { Unit } from '@devloggers/db-prisma';
import { UnitsRepository } from '../repositories/units.repository';
import { UnitPresenter } from '../presenters/unit.presenter';
import { CreateUnitDto, UpdateUnitDto, UnitResponseDto } from '../dto';
/**
 * Units service — business logic layer for the `units` resource.
 *
 * Extends CrudService which provides list, findById, create, update, delete.
 * Business rules (e.g. unique name constraint) live in beforeCreate / beforeUpdate hooks.
 * Domain events are emitted in onCreated / onUpdated / onDeleted hooks.
 */
@Injectable()
export class UnitsService extends CrudService<Unit, UnitResponseDto, CreateUnitDto, UpdateUnitDto> {
  protected readonly resourceName = resources.units.key;

  constructor(
    private readonly unitsRepository: UnitsRepository,
    private readonly unitPresenter: UnitPresenter,
    private readonly emitter: EventEmitter2,
  ) {
    super(unitsRepository, unitPresenter, emitter);
  }

  // ── Business rule hooks ──────────────────────────────────────────────────

  protected override async beforeCreate(tenantId: string, dto: CreateUnitDto): Promise<void> {
    const taken = await this.unitsRepository.isNameTaken(tenantId, dto.name);
    if (taken) {
      throw new ConflictException(`A unit named "${dto.name}" already exists`);
    }
  }

  protected override async beforeUpdate(
    tenantId: string,
    id: string,
    dto: UpdateUnitDto,
  ): Promise<void> {
    if (dto.name) {
      const taken = await this.unitsRepository.isNameTaken(tenantId, dto.name, id);
      if (taken) {
        throw new ConflictException(`A unit named "${dto.name}" already exists`);
      }
    }
  }

}
