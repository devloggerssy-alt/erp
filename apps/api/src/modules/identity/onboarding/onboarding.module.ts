import { Module } from '@nestjs/common';
import { PrismaModule } from '@devloggers/db-prisma/nest';
import { SettingsModule } from '../settings/settings.module';
import { FiscalPeriodsModule } from '../../accounting/fiscal-periods/fiscal-periods.module';
import { DocumentSequencesModule } from '../../accounting/document-sequences/document-sequences.module';
import { FinancialSettingsModule } from '../../accounting/financial-settings/financial-settings.module';
import { OnboardingService } from './services/onboarding.service';
import { OnboardingController } from './controllers/onboarding.controller';

@Module({
    imports: [
        PrismaModule,
        SettingsModule,
        FiscalPeriodsModule,
        DocumentSequencesModule,
        FinancialSettingsModule,
    ],
    controllers: [OnboardingController],
    providers: [OnboardingService],
})
export class OnboardingModule {}
