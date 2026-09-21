import { BadRequestException, Injectable } from '@nestjs/common';
import { FinancialSettingsService } from '../../financial-settings/services/financial-settings.service';
import type { JournalLineDraft } from '../contracts/journal-line-draft';
import type { StockCountAdjustedIntent } from '../contracts/posting-intent';

function round(value: number): number {
    return Math.round(value * 10000) / 10000;
}

/** Absorbs stock-counts.service.ts's settings guard + inventory-journal.ts's buildStockCountVarianceLines. */
@Injectable()
export class StockCountAdjustedPolicy {
    constructor(private readonly financialSettingsService: FinancialSettingsService) {}

    async buildLines(intent: StockCountAdjustedIntent): Promise<JournalLineDraft[]> {
        const settings = await this.financialSettingsService.getOrThrow(intent.tenantId);
        if (!settings.defaultInventoryAccountId || !settings.defaultInventoryAdjustmentAccountId) {
            throw new BadRequestException(
                'No default Inventory / Inventory-Adjustment account configured in Financial Settings.',
            );
        }
        const amt = round(Math.abs(intent.netVariance));
        const surplus = intent.netVariance > 0;
        // Variance is valued at base-currency average cost — amount = base, rate 1 (reconciliation check 8).
        return [
            { accountId: settings.defaultInventoryAccountId, debit: surplus ? amt : 0, credit: surplus ? 0 : amt, description: null, sortOrder: 0, amount: amt, exchangeRate: 1 },
            { accountId: settings.defaultInventoryAdjustmentAccountId, debit: surplus ? 0 : amt, credit: surplus ? amt : 0, description: null, sortOrder: 1, amount: amt, exchangeRate: 1 },
        ];
    }
}
