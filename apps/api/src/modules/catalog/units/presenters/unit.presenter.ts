import { Injectable } from '@nestjs/common';
import { CrudPresenter, LocaleResolverService } from '@devloggers/backend-core';
import type { Unit } from '@devloggers/db-prisma';
import { toLocalizedString } from '@/common/i18n/localized-string';
import { UnitResponseDto } from '../dto';

@Injectable()
export class UnitPresenter extends CrudPresenter<Unit, UnitResponseDto> {
  constructor(private readonly locale: LocaleResolverService) {
    super();
  }

  toResponse(entity: Unit): UnitResponseDto {
    const name = toLocalizedString(entity.name) ?? { ar: '' };
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
