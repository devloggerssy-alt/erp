import { Module } from '@nestjs/common';
import { SettingsController } from './controllers/settings.controller';
import { FormDefaultsController } from './controllers/form-defaults.controller';
import { DataResetController } from './controllers/data-reset.controller';
import { DatabaseBackupController } from './controllers/database-backup.controller';
import { SettingsService } from './services/settings.service';
import { DataResetService } from './services/data-reset.service';
import { DatabaseExportService } from './services/database-export.service';
import { DatabaseImportService } from './services/database-import.service';
import { TenantSettingsRepository } from './repositories/tenant-settings.repository';
import { LocaleResolverService } from '@devloggers/backend-core';
import { PrismaModule } from '@devloggers/db-prisma/nest';

@Module({
    imports: [PrismaModule],
    controllers: [SettingsController, FormDefaultsController, DataResetController, DatabaseBackupController],
    providers: [
        SettingsService,
        DataResetService,
        DatabaseExportService,
        DatabaseImportService,
        TenantSettingsRepository,
        LocaleResolverService,
    ],
    exports: [SettingsService],
})
export class SettingsModule {}
