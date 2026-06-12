import { Module } from '@nestjs/common';
import { CatalogEntitiesRepository } from './repositories/catalog-entities.repository';
import { CatalogEntitiesService } from './services/catalog-entities.service';
import { CatalogEntityPresenter } from './presenters/catalog-entity.presenter';
import { CatalogEntitiesController } from './controllers/catalog-entities.controller';

@Module({
  controllers: [CatalogEntitiesController],
  providers: [CatalogEntitiesRepository, CatalogEntitiesService, CatalogEntityPresenter],
  exports: [CatalogEntitiesService],
})
export class CatalogEntitiesModule {}
