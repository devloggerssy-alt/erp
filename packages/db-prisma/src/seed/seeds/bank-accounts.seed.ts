import type { PrismaClient } from '../../../generated/client'
import { SEED_IDS } from '../seed-ids'

export async function seedBankAccounts(prisma: PrismaClient, tenantId: string): Promise<void> {
    await prisma.bankAccount.create({
        data: {
            id: SEED_IDS.BANK_ACCOUNT_MAIN,
            tenantId,
            code: 'BANK-SYP',
            name: { ar: 'الحساب البنكي الرئيسي', en: 'Main Bank Account' },
            currencyId: SEED_IDS.CURRENCY_SYP,
            accountNumber: '001-000-123456',
            bankName: 'Commercial Bank',
        },
    })
}
