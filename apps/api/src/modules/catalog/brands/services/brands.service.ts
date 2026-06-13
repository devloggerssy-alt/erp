import { Injectable, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrudService } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { Brand } from '@devloggers/db-prisma';
import { BrandsRepository } from '../repositories/brands.repository';
import { BrandPresenter } from '../presenters/brand.presenter';
import { CreateBrandDto, UpdateBrandDto, BrandResponseDto } from '../dto';

@Injectable()
export class BrandsService extends CrudService<Brand, BrandResponseDto, CreateBrandDto, UpdateBrandDto> {
  protected readonly resourceName = resources.brands.key;

  constructor(
    private readonly brandsRepository: BrandsRepository,
    private readonly brandPresenter: BrandPresenter,
    private readonly emitter: EventEmitter2,
  ) {
    super(brandsRepository, brandPresenter, emitter);
  }

  protected override async beforeCreate(tenantId: string, dto: CreateBrandDto): Promise<void> {
    const taken = await this.brandsRepository.isNameTaken(tenantId, dto.name);
    if (taken) {
      throw new ConflictException(`A brand named "${dto.name}" already exists`);
    }
  }

  protected override async beforeUpdate(
    tenantId: string,
    id: string,
    dto: UpdateBrandDto,
  ): Promise<void> {
    if (dto.name) {
      const taken = await this.brandsRepository.isNameTaken(tenantId, dto.name, id);
      if (taken) {
        throw new ConflictException(`A brand named "${dto.name}" already exists`);
      }
    }
  }
}
