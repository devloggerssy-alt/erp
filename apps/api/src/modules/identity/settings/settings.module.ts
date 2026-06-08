import { Module } from '@nestjs/common';
import { SettingsController } from './controllers/settings.controller';
import { SettingsService } from './services/settings.service';
import { TenantSettingsRepository } from './repositories/tenant-settings.repository';

@Module({
    controllers: [SettingsController],
    providers: [SettingsService, TenantSettingsRepository],
    exports: [SettingsService],
})
export class SettingsModule {}
