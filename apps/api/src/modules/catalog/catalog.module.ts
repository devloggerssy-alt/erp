import { Module } from '@nestjs/common';
import { UnitsModule } from './units/units.module';
import { ItemCategoriesModule } from './item-categories/item-categories.module';
import { ItemsModule } from './items/items.module';

@Module({
  imports: [UnitsModule, ItemCategoriesModule, ItemsModule],
  exports: [UnitsModule, ItemCategoriesModule, ItemsModule],
})
export class CatalogModule {}
