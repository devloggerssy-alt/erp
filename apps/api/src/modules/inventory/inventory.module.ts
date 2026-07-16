import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './repositories/inventory.repository';
import { InventoryPresenter } from './presenters/inventory.presenter';
import { WarehousesModule } from './warehouses/warehouses.module';
import { FinancialSettingsModule } from '../accounting/financial-settings/financial-settings.module';
import { DocumentSequencesModule } from '../accounting/document-sequences/document-sequences.module';
import { AccountsModule } from '../accounting/accounts/accounts.module';

@Module({
    imports: [WarehousesModule, FinancialSettingsModule, DocumentSequencesModule, AccountsModule],
    controllers: [InventoryController],
    providers: [InventoryService, InventoryRepository, InventoryPresenter],
    exports: [InventoryService, WarehousesModule],
})
export class InventoryModule {}
