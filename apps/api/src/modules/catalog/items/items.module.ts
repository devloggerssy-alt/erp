import { Module } from '@nestjs/common';
import { CustomFieldsModule } from '@/modules/custom-fields';
import { InventoryModule } from '@/modules/inventory';
import { CodeSequencesModule } from '@/modules/platform';
import { ItemsController } from './controllers/items.controller';
import { ItemsImportExportController } from './controllers/items-import-export.controller';
import { ItemsService } from './services/items.service';
import { ItemsExportService } from './services/items-export.service';
import { ItemsImportService } from './services/items-import.service';
import { ItemsRepository } from './repositories/items.repository';
import { ItemPresenter } from './presenters/item.presenter';
import { ItemsAiTools } from './items.ai-tools';

@Module({
    imports: [CustomFieldsModule, InventoryModule, CodeSequencesModule],
    controllers: [ItemsImportExportController, ItemsController],
    providers: [ItemsService, ItemsExportService, ItemsImportService, ItemsRepository, ItemPresenter, ItemsAiTools],
    exports: [ItemsService],
})
export class ItemsModule {}
