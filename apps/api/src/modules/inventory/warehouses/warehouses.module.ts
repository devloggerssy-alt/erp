import { Module } from '@nestjs/common';
import { LocaleResolverService } from '@devloggers/backend-core';
import { WarehousesController } from './controllers/warehouses.controller';
import { WarehousesService } from './services/warehouses.service';
import { WarehousesRepository } from './repositories/warehouses.repository';
import { WarehousePresenter } from './presenters/warehouse.presenter';

@Module({
    controllers: [WarehousesController],
    providers: [WarehousesService, WarehousesRepository, WarehousePresenter, LocaleResolverService],
    exports: [WarehousesService],
})
export class WarehousesModule {}
