import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './repositories/inventory.repository';
import { InventoryPresenter } from './presenters/inventory.presenter';
import { WarehousesModule } from './warehouses/warehouses.module';

@Module({
    imports: [WarehousesModule],
    controllers: [InventoryController],
    providers: [InventoryService, InventoryRepository, InventoryPresenter],
    exports: [InventoryService, WarehousesModule],
})
export class InventoryModule {}
