import { compileIsolated } from '../../../../common/testing/module-isolation';
import { AuditWriter } from '../../../audit';
import { DocumentSequencesService } from '../../document-sequences/services/document-sequences.service';
import { FinancialSettingsService } from '../../financial-settings/services/financial-settings.service';
import { AccountingPostingFacade } from '../accounting-posting.facade';
import { PostingModule } from '../posting.module';
import type { InvoicePostedIntent } from '../contracts/posting-intent';
import type { PrismaTransactionClient } from '../contracts/prisma-tx';

const settingsFixture = {
    defaultReceivableAccountId: 'ar',
    defaultSalesAccountId: 'sales',
    defaultPayableAccountId: 'ap',
    defaultPurchaseAccountId: 'purchases',
    defaultTaxAccountId: null,
    defaultInventoryAccountId: 'inventory',
    defaultCogsAccountId: 'cogs',
};

const saleIntent: InvoicePostedIntent = {
    kind: 'INVOICE_POSTED',
    tenantId: 't1',
    userId: 'u1',
    date: new Date('2026-09-20T00:00:00.000Z'),
    fiscalPeriodId: 'fp1',
    fiscalPeriodStatus: 'OPEN',
    exchangeRate: 1,
    referenceId: 'inv-1',
    description: 'Sales invoice INV-1',
    direction: 'SALE',
    partyId: 'party-1',
    currencyId: 'USD',
    netAmount: 100,
    taxAmount: 0,
    total: 100,
};

function createTx() {
    const accounts = [
        { id: 'ar', code: '1100', type: 'ASSET', isPostable: true, isContra: false, deletedAt: null },
        { id: 'sales', code: '4000', type: 'REVENUE', isPostable: true, isContra: false, deletedAt: null },
    ];
    return {
        chartOfAccount: { findMany: jest.fn().mockResolvedValue(accounts) },
        party: { findFirst: jest.fn().mockResolvedValue({ receivableAccountId: 'ar', payableAccountId: null }) },
        journalEntry: { create: jest.fn().mockResolvedValue({ id: 'je-1' }) },
    } as unknown as PrismaTransactionClient;
}

describe('PostingModule — isolation contract (Phase 8.3.1)', () => {
    it('boots without AppModule and posts through the facade', async () => {
        const audit = { recordInTx: jest.fn().mockResolvedValue(undefined) };
        const moduleRef = await compileIsolated([PostingModule], (builder) =>
            builder
                .overrideProvider(FinancialSettingsService)
                .useValue({ getOrThrow: jest.fn().mockResolvedValue(settingsFixture) })
                .overrideProvider(DocumentSequencesService)
                .useValue({ getNextNumber: jest.fn().mockResolvedValue('JE-000001') })
                .overrideProvider(AuditWriter)
                .useValue(audit),
        );

        const facade = moduleRef.get(AccountingPostingFacade);
        const tx = createTx();

        await expect(facade.record(tx, saleIntent)).resolves.toEqual({ journalEntryId: 'je-1' });
        expect(audit.recordInTx).toHaveBeenCalledWith(
            tx,
            expect.objectContaining({ action: 'JOURNAL_POST', entityId: 'je-1', source: 'GL' }),
        );

        await moduleRef.close();
    });
});
