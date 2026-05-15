import { Module } from '@nestjs/common';
import { UnitsRepository } from './repositories/units.repository';
import { UnitsService } from './services/units.service';
import { UnitPresenter } from './presenters/unit.presenter';
import { UnitsController } from './controllers/units.controller';

/**
 * UnitsModule — unit of measure CRUD feature.
 *
 * Providers follow the 4-layer architecture:
 *   Controller → Service → Repository → Presenter
 *
 * Exports UnitsService so CatalogModule (and other domain modules)
 * can inject it for cross-module business logic.
 */
@Module({
  controllers: [UnitsController],
  providers: [UnitsRepository, UnitsService, UnitPresenter],
  exports: [UnitsService],
})
export class UnitsModule {}
