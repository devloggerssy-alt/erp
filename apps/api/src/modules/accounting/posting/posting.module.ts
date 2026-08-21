import { Module } from '@nestjs/common';
import { FinancialSettingsModule } from '../financial-settings/financial-settings.module';
import { DocumentSequencesModule } from '../document-sequences/document-sequences.module';
import { JournalPostingService } from '../accounts/services/journal-posting.service';
import { InvoicePostedPolicy } from './policies/invoice-posted.policy';
import { InvoiceCancelledPolicy } from './policies/invoice-cancelled.policy';
import { PaymentRecordedPolicy, PaymentCancelledPolicy } from './policies/payment-recorded.policy';
import { ExpenseRecordedPolicy, ExpenseCancelledPolicy } from './policies/expense-recorded.policy';
import { StockCountAdjustedPolicy } from './policies/stock-count-adjusted.policy';
import { OpeningBalancePolicy } from './policies/opening-balance.policy';
import { OpeningStockPolicy } from './policies/opening-stock.policy';
import { OpeningSessionPostedPolicy } from './policies/opening-session.policy';
import { PostingPolicyRegistry } from './posting-policy.registry';
import { AccountingPostingFacade } from './accounting-posting.facade';

/**
 * Provides JournalPostingService itself (not imported via AccountsModule) —
 * JournalPostingService has no constructor dependencies, and giving it its
 * own registration here breaks what would otherwise be a circular import:
 * AccountsModule needs PostingModule (for OpeningBalancesService, Task 16)
 * and PostingModule would need AccountsModule (for JournalPostingService).
 * See Task 16 for the other half of this.
 */
@Module({
    imports: [FinancialSettingsModule, DocumentSequencesModule],
    providers: [
        JournalPostingService,
        InvoicePostedPolicy,
        InvoiceCancelledPolicy,
        PaymentRecordedPolicy,
        PaymentCancelledPolicy,
        ExpenseRecordedPolicy,
        ExpenseCancelledPolicy,
        StockCountAdjustedPolicy,
        OpeningBalancePolicy,
        OpeningStockPolicy,
        OpeningSessionPostedPolicy,
        PostingPolicyRegistry,
        AccountingPostingFacade,
    ],
    exports: [AccountingPostingFacade],
})
export class PostingModule {}
