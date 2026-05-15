import { Module } from '@nestjs/common';
import { ItemCategoriesController } from './controllers/item-categories.controller';
import { ItemCategoriesService } from './services/item-categories.service';

@Module({
    controllers: [ItemCategoriesController],
    providers: [ItemCategoriesService],
    exports: [ItemCategoriesService],
})
export class ItemCategoriesModule {}
