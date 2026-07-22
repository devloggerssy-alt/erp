import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrudService } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { Unit } from '@devloggers/db-prisma';
import { UnitsRepository } from '../repositories/units.repository';
import { UnitPresenter } from '../presenters/unit.presenter';
import { CreateUnitDto, UpdateUnitDto, UnitResponseDto } from '../dto';

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
}
