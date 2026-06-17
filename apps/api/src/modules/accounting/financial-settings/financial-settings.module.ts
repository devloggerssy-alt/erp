import { Module } from '@nestjs/common';
import { FinancialSettingsRepository } from './repositories/financial-settings.repository';
import { FinancialSettingsService } from './services/financial-settings.service';
import { FinancialSettingsController } from './controllers/financial-settings.controller';

@Module({
    controllers: [FinancialSettingsController],
    providers: [FinancialSettingsRepository, FinancialSettingsService],
    exports: [FinancialSettingsService],
})
export class FinancialSettingsModule {}
