import { Injectable } from '@nestjs/common';
import { CrudPresenter } from '@devloggers/backend-core';
import type { Brand } from '@devloggers/db-prisma';
import { BrandResponseDto } from '../dto';

@Injectable()
export class BrandPresenter extends CrudPresenter<Brand, BrandResponseDto> {
  toResponse(entity: Brand): BrandResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      imageUrl: entity.imageUrl ?? null,
      isActive: entity.isActive,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
