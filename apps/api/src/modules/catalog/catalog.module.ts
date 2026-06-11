import { Module } from '@nestjs/common';
import { UnitsModule } from './units/units.module';
import { ItemCategoriesModule } from './item-categories/item-categories.module';
import { ItemsModule } from './items/items.module';
import { TagsModule } from './tags/tags.module';
import { TagAssignmentsModule } from './tag-assignments/tag-assignments.module';
import { ItemRelationsModule } from './item-relations/item-relations.module';

@Module({
  imports: [UnitsModule, ItemCategoriesModule, ItemsModule, TagsModule, TagAssignmentsModule, ItemRelationsModule],
  exports: [UnitsModule, ItemCategoriesModule, ItemsModule, TagsModule, TagAssignmentsModule, ItemRelationsModule],
})
export class CatalogModule {}
