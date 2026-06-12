import { Module } from '@nestjs/common';
import { ItemCatalogEntitiesRepository } from './repositories/item-catalog-entities.repository';
import { ItemCatalogEntitiesService } from './services/item-catalog-entities.service';
import { ItemCatalogEntityPresenter } from './presenters/item-catalog-entity.presenter';
import { ItemCatalogEntitiesController } from './controllers/item-catalog-entities.controller';

@Module({
  controllers: [ItemCatalogEntitiesController],
  providers: [
    ItemCatalogEntitiesRepository,
    ItemCatalogEntitiesService,
    ItemCatalogEntityPresenter,
  ],
  exports: [ItemCatalogEntitiesService],
})
export class ItemCatalogEntitiesModule {}
