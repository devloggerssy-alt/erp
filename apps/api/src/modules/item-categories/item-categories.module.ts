import { Module } from '@nestjs/common';
import { ItemCategoriesController } from './item-categories.controller';
import { ItemCategoriesService } from './item-categories.service';

@Module({
    controllers: [ItemCategoriesController],
    providers: [ItemCategoriesService],
    exports: [ItemCategoriesService],
})
export class ItemCategoriesModule {}
