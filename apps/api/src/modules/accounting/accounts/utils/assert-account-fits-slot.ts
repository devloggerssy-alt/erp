import { BadRequestException } from '@nestjs/common';
import type { AccountType } from '@devloggers/db-prisma';

export type AccountSlotName =
    | 'defaultSales'
    | 'defaultPurchase'
    | 'defaultTax'
    | 'defaultReceivable'
    | 'defaultPayable'
    | 'defaultInventory'
    | 'defaultCogs'
    | 'defaultInventoryAdjustment'
    | 'defaultOpeningEquity';

export const SLOT_EXPECTATIONS: Record<AccountSlotName, AccountType> = {
    defaultSales: 'REVENUE',
    defaultPurchase: 'EXPENSE',
    defaultTax: 'LIABILITY',
    defaultReceivable: 'ASSET',
    defaultPayable: 'LIABILITY',
    defaultInventory: 'ASSET',
    defaultCogs: 'EXPENSE',
    defaultInventoryAdjustment: 'EXPENSE',
    defaultOpeningEquity: 'EQUITY',
};

export interface AccountSlotCheck {
    id: string;
    code: string;
    type: AccountType;
    isPostable: boolean;
    isContra: boolean;
    deletedAt: Date | null;
    isActive: boolean;
}

export function assertAccountFitsSlot(
    account: AccountSlotCheck | null,
    expectedType: AccountType,
    slotName: AccountSlotName,
): void {
    if (!account) {
        throw new BadRequestException(`No account configured for slot "${slotName}"`);
    }
    if (account.deletedAt) {
        throw new BadRequestException(`Account "${account.code}" is deleted (slot "${slotName}")`);
    }
    if (!account.isPostable) {
        throw new BadRequestException(`Account "${account.code}" is not postable (slot "${slotName}")`);
    }
    if (!account.isActive) {
        throw new BadRequestException(`Account "${account.code}" is inactive (slot "${slotName}")`);
    }
    if (account.type !== expectedType) {
        throw new BadRequestException(
            `Account "${account.code}" is not a valid ${slotName} (must be ${expectedType}, got ${account.type})`,
        );
    }
}