import { Injectable } from '@nestjs/common';
import { CrudPresenter, LocaleResolverService } from '@devloggers/backend-core';
import type { Unit } from '@devloggers/db-prisma';
import type { LocalizedString } from '@devloggers/api-contracts';
import { UnitResponseDto } from '../dto';

@Injectable()
export class UnitPresenter extends CrudPresenter<Unit, UnitResponseDto> {
  constructor(private readonly locale: LocaleResolverService) {
    super();
  }

  toResponse(entity: Unit): UnitResponseDto {
    const name = entity.name as unknown as LocalizedString;
    return {
      id: entity.id,
      name: this.locale.resolve(name),
      nameI18n: name,
      abbreviation: entity.abbreviation,
      isActive: entity.isActive,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
