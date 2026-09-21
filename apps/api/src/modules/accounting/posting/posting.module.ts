import { Module } from '@nestjs/common';
import { FinancialSettingsModule } from '../financial-settings/financial-settings.module';
import { DocumentSequencesModule } from '../document-sequences/document-sequences.module';
import { OutboxModule } from '../../../outbox/outbox.module';
import { JournalPostingService } from '../accounts/services/journal-posting.service';
import { InvoicePostedPolicy } from './policies/invoice-posted.policy';
import { InvoiceCancelledPolicy } from './policies/invoice-cancelled.policy';
import { PaymentRecordedPolicy, PaymentCancelledPolicy } from './policies/payment-recorded.policy';
import { ExpenseRecordedPolicy, ExpenseCancelledPolicy } from './policies/expense-recorded.policy';
import { StockCountAdjustedPolicy } from './policies/stock-count-adjusted.policy';
import { OpeningStockPolicy } from './policies/opening-stock.policy';
import { OpeningSessionPostedPolicy } from './policies/opening-session.policy';
import { PostingPolicyRegistry } from './posting-policy.registry';
import { AccountingPostingFacade } from './accounting-posting.facade';

@Module({
    imports: [FinancialSettingsModule, DocumentSequencesModule, OutboxModule],
    providers: [
        JournalPostingService,
        InvoicePostedPolicy,
        InvoiceCancelledPolicy,
        PaymentRecordedPolicy,
        PaymentCancelledPolicy,
        ExpenseRecordedPolicy,
        ExpenseCancelledPolicy,
        StockCountAdjustedPolicy,
        OpeningStockPolicy,
        OpeningSessionPostedPolicy,
        PostingPolicyRegistry,
        AccountingPostingFacade,
    ],
    exports: [AccountingPostingFacade, OpeningSessionPostedPolicy],
})
export class PostingModule {}
