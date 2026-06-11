import { Module } from '@nestjs/common';
import { UnitsModule } from './units/units.module';
import { ItemCategoriesModule } from './item-categories/item-categories.module';
import { ItemsModule } from './items/items.module';
import { TagsModule } from './tags/tags.module';

@Module({
  imports: [UnitsModule, ItemCategoriesModule, ItemsModule, TagsModule],
  exports: [UnitsModule, ItemCategoriesModule, ItemsModule, TagsModule],
})
export class CatalogModule {}
