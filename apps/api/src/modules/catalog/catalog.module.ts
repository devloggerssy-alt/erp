import { Module } from '@nestjs/common';
import { UnitsModule } from './units/units.module';

/**
 * CatalogModule — domain module for all catalog resources.
 *
 * Groups: Units, Items, Item Categories (and future catalog resources).
 *
 * Import this module in AppModule instead of individual catalog feature modules.
 * Each sub-module manages its own controllers and exports its service
 * for cross-domain injection.
 */
@Module({
  imports: [UnitsModule],
  exports: [UnitsModule],
})
export class CatalogModule {}
