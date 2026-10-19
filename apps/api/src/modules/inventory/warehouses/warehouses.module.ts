import { Module } from '@nestjs/common';
import { LocaleResolverService } from '@devloggers/backend-core';
import { BranchesModule, CodeSequencesModule } from '@/modules/platform';
import { WarehousesController } from './controllers/warehouses.controller';
import { WarehousesService } from './services/warehouses.service';
import { WarehousesRepository } from './repositories/warehouses.repository';
import { WarehousePresenter } from './presenters/warehouse.presenter';
import { WarehousesAiTools } from './warehouses.ai-tools';

@Module({
    imports: [CodeSequencesModule, BranchesModule],
    controllers: [WarehousesController],
    providers: [WarehousesService, WarehousesRepository, WarehousePresenter, LocaleResolverService, WarehousesAiTools],
    exports: [WarehousesService],
})
export class WarehousesModule {}
