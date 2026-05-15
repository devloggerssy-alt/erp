import { Module } from '@nestjs/common';
import { ItemsController } from './controllers/items.controller';
import { ItemsService } from './services/items.service';
import { ItemsRepository } from './repositories/items.repository';
import { ItemPresenter } from './presenters/item.presenter';

@Module({
    controllers: [ItemsController],
    providers: [ItemsService, ItemsRepository, ItemPresenter],
    exports: [ItemsService],
})
export class ItemsModule {}
