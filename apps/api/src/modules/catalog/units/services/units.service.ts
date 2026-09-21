import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrudService } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { Unit } from '@devloggers/db-prisma';
import { UnitsRepository } from '../repositories/units.repository';
import { UnitPresenter } from '../presenters/unit.presenter';
import { CreateUnitDto, UpdateUnitDto, UnitResponseDto } from '../dto';
import { DEFAULT_UNITS } from '../default-units';

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

  /**
   * Idempotently creates the standard units of measure for a new tenant.
   * Called by onboarding; returns the number of units created (0 when the
   * tenant already has any unit).
   */
  async createDefaults(tenantId: string): Promise<number> {
    const existing = await this.unitsRepository.findMany(tenantId, { take: 1 });
    if (existing.total > 0) return 0;

    return this.unitsRepository.createMany(
      DEFAULT_UNITS.map((unit) => ({ tenantId, ...unit })),
    );
  }
}
