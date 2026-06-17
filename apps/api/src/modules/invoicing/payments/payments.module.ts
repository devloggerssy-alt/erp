import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { DocumentSequencesModule } from '../../accounting/document-sequences/document-sequences.module';
import { FinancialSettingsModule } from '../../accounting/financial-settings/financial-settings.module';

@Module({
    imports: [DocumentSequencesModule, FinancialSettingsModule],
    controllers: [PaymentsController],
    providers: [PaymentsService],
    exports: [PaymentsService],
})
export class PaymentsModule {}
