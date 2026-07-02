import { Module } from '@nestjs/common';
import { SettingsController } from './controllers/settings.controller';
import { DataResetController } from './controllers/data-reset.controller';
import { SettingsService } from './services/settings.service';
import { DataResetService } from './services/data-reset.service';
import { TenantSettingsRepository } from './repositories/tenant-settings.repository';
import { LocaleResolverService } from '@devloggers/backend-core';
import { PrismaModule } from '@devloggers/db-prisma/nest';

@Module({
    imports: [PrismaModule],
    controllers: [SettingsController, DataResetController],
    providers: [SettingsService, DataResetService, TenantSettingsRepository, LocaleResolverService],
    exports: [SettingsService],
})
export class SettingsModule {}
