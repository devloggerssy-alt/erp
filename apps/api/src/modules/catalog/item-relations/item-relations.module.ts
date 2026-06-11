import { Module } from '@nestjs/common';
import { ItemRelationsRepository } from './repositories/item-relations.repository';
import { ItemRelationsService } from './services/item-relations.service';
import { ItemRelationPresenter } from './presenters/item-relation.presenter';
import { ItemRelationsController } from './controllers/item-relations.controller';

@Module({
  controllers: [ItemRelationsController],
  providers: [ItemRelationsRepository, ItemRelationsService, ItemRelationPresenter],
  exports: [ItemRelationsService],
})
export class ItemRelationsModule {}
