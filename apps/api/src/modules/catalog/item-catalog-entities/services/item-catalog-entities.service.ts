import { Injectable, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrudService } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import {
  ItemCatalogEntitiesRepository,
  type ItemCatalogEntityWithRelations,
} from '../repositories/item-catalog-entities.repository';
import { ItemCatalogEntityPresenter } from '../presenters/item-catalog-entity.presenter';
import {
  CreateItemCatalogEntityDto,
  UpdateItemCatalogEntityDto,
  ItemCatalogEntityResponseDto,
} from '../dto';

@Injectable()
export class ItemCatalogEntitiesService extends CrudService<
  ItemCatalogEntityWithRelations,
  ItemCatalogEntityResponseDto,
  CreateItemCatalogEntityDto,
  UpdateItemCatalogEntityDto
> {
  protected readonly resourceName = resources.itemCatalogEntities.key;

  constructor(
    private readonly itemCatalogEntitiesRepository: ItemCatalogEntitiesRepository,
    private readonly itemCatalogEntityPresenter: ItemCatalogEntityPresenter,
    private readonly emitter: EventEmitter2,
  ) {
    super(itemCatalogEntitiesRepository, itemCatalogEntityPresenter, emitter);
  }

  // ── Business rule hooks ──────────────────────────────────────────────────

  protected override async beforeCreate(
    tenantId: string,
    dto: CreateItemCatalogEntityDto,
  ): Promise<void> {
    const exists = await this.itemCatalogEntitiesRepository.existsLink(
      tenantId,
      dto.itemId,
      dto.catalogEntityId,
    );
    if (exists) {
      throw new ConflictException(
        `Item '${dto.itemId}' is already linked to catalog entity '${dto.catalogEntityId}'`,
      );
    }
  }
}
