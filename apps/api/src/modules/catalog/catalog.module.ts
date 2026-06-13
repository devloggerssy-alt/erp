import { Module } from '@nestjs/common';
import { UnitsModule } from './units/units.module';
import { ItemCategoriesModule } from './item-categories/item-categories.module';
import { ItemsModule } from './items/items.module';
import { TagsModule } from './tags/tags.module';
import { TagAssignmentsModule } from './tag-assignments/tag-assignments.module';
import { ItemRelationsModule } from './item-relations/item-relations.module';
import { CatalogEntitiesModule } from './catalog-entities/catalog-entities.module';
import { ItemCatalogEntitiesModule } from './item-catalog-entities/item-catalog-entities.module';
import { BrandsModule } from './brands/brands.module';

@Module({
  imports: [UnitsModule, ItemCategoriesModule, ItemsModule, TagsModule, TagAssignmentsModule, ItemRelationsModule, CatalogEntitiesModule, ItemCatalogEntitiesModule, BrandsModule],
  exports: [UnitsModule, ItemCategoriesModule, ItemsModule, TagsModule, TagAssignmentsModule, ItemRelationsModule, CatalogEntitiesModule, ItemCatalogEntitiesModule, BrandsModule],
})
export class CatalogModule {}
