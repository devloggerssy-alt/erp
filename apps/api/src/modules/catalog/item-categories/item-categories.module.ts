import { Module } from '@nestjs/common';
import { ItemCategoriesController } from './controllers/item-categories.controller';
import { ItemCategoriesService } from './services/item-categories.service';
import { ItemCategoriesRepository } from './repositories/item-categories.repository';
import { ItemCategoryPresenter } from './presenters/item-category.presenter';

@Module({
    controllers: [ItemCategoriesController],
    providers: [ItemCategoriesService, ItemCategoriesRepository, ItemCategoryPresenter],
    exports: [ItemCategoriesService],
})
export class ItemCategoriesModule {}
