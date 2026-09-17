import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './repositories/inventory.repository';
import { InventoryPresenter } from './presenters/inventory.presenter';
import { WarehousesModule } from './warehouses/warehouses.module';
import { InventoryMovementsModule } from './movements/inventory-movements.module';
import { PostingModule } from '../accounting/posting';

@Module({
    imports: [WarehousesModule, PostingModule, InventoryMovementsModule],
    controllers: [InventoryController],
    providers: [InventoryService, InventoryRepository, InventoryPresenter],
    exports: [InventoryService, WarehousesModule, InventoryMovementsModule],
})
export class InventoryModule {}
