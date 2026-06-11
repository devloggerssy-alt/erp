import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrudService } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { ItemRelation } from '@devloggers/db-prisma';
import { ItemRelationsRepository } from '../repositories/item-relations.repository';
import { ItemRelationPresenter } from '../presenters/item-relation.presenter';
import { CreateItemRelationDto, UpdateItemRelationDto, ItemRelationResponseDto } from '../dto';

@Injectable()
export class ItemRelationsService extends CrudService<
  ItemRelation,
  ItemRelationResponseDto,
  CreateItemRelationDto,
  UpdateItemRelationDto
> {
  protected readonly resourceName = resources.itemRelations.key;

  constructor(
    private readonly itemRelationsRepository: ItemRelationsRepository,
    private readonly itemRelationPresenter: ItemRelationPresenter,
    private readonly emitter: EventEmitter2,
  ) {
    super(itemRelationsRepository, itemRelationPresenter, emitter);
  }

  // ── Business rule hooks ──────────────────────────────────────────────────

  protected override async beforeCreate(
    tenantId: string,
    dto: CreateItemRelationDto,
  ): Promise<void> {
    if (dto.itemId === dto.relatedItemId) {
      throw new BadRequestException('An item cannot be related to itself');
    }
    const exists = await this.itemRelationsRepository.existsRelation(
      tenantId,
      dto.itemId,
      dto.relatedItemId,
      dto.relationType,
    );
    if (exists) {
      throw new ConflictException(
        `A "${dto.relationType}" relation already exists between these items`,
      );
    }
  }

  protected override async beforeUpdate(
    tenantId: string,
    id: string,
    dto: UpdateItemRelationDto,
    existing: ItemRelation,
  ): Promise<void> {
    if (dto.relationType) {
      const exists = await this.itemRelationsRepository.existsRelation(
        tenantId,
        existing.itemId,
        existing.relatedItemId,
        dto.relationType,
        id,
      );
      if (exists) {
        throw new ConflictException(
          `A "${dto.relationType}" relation already exists between these items`,
        );
      }
    }
  }
}
