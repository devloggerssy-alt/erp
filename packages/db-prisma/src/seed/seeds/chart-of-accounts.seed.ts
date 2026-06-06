import type { PrismaClient } from '../../../generated/client'
import { SEED_IDS } from '../seed-ids'

const n = (ar: string, en: string) => ({ ar, en })

export async function seedChartOfAccounts(prisma: PrismaClient, tenantId: string): Promise<void> {
    // Level 1 — root groups
    await Promise.all([
        prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_ASSETS,        tenantId, code: '1000', name: n('الأصول',             'Assets'),         type: 'ASSET' } }),
        prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_LIABILITIES,   tenantId, code: '2000', name: n('الالتزامات',         'Liabilities'),    type: 'LIABILITY' } }),
        prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_EQUITY,        tenantId, code: '3000', name: n('حقوق الملكية',       'Equity'),         type: 'EQUITY' } }),
        prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_REVENUE,       tenantId, code: '4000', name: n('الإيرادات',          'Revenue'),        type: 'REVENUE' } }),
        prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_COST_OF_SALES, tenantId, code: '5000', name: n('تكلفة المبيعات',     'Cost of Sales'),  type: 'EXPENSE' } }),
        prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_EXPENSES,      tenantId, code: '6000', name: n('المصروفات',          'Expenses'),       type: 'EXPENSE' } }),
    ])

    // Level 2 — sub-groups
    await Promise.all([
        prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_CURRENT_ASSETS,     tenantId, code: '1100', name: n('الأصول المتداولة',               'Current Assets'),          type: 'ASSET',     parentId: SEED_IDS.ACCT_ASSETS } }),
        prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_NON_CURRENT_ASSETS, tenantId, code: '1200', name: n('الأصول غير المتداولة',           'Non-Current Assets'),      type: 'ASSET',     parentId: SEED_IDS.ACCT_ASSETS } }),
        prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_CURRENT_LIAB,       tenantId, code: '2100', name: n('الالتزامات المتداولة',            'Current Liabilities'),     type: 'LIABILITY', parentId: SEED_IDS.ACCT_LIABILITIES } }),
        prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_NON_CURRENT_LIAB,   tenantId, code: '2200', name: n('الالتزامات غير المتداولة',        'Non-Current Liabilities'), type: 'LIABILITY', parentId: SEED_IDS.ACCT_LIABILITIES } }),
        prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_OPERATING_EXP,      tenantId, code: '6100', name: n('المصروفات التشغيلية',             'Operating Expenses'),      type: 'EXPENSE',   parentId: SEED_IDS.ACCT_EXPENSES } }),
        prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_ADMIN_EXP,          tenantId, code: '6200', name: n('المصروفات الإدارية',             'Administrative Expenses'), type: 'EXPENSE',   parentId: SEED_IDS.ACCT_EXPENSES } }),
    ])

    // Level 3 — leaf accounts
    await Promise.all([
        // Current Assets
        prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_1110_CASH,         tenantId, code: '1110', name: n('النقد وما في حكمه',          'Cash and Cash Equivalents'), type: 'ASSET',     parentId: SEED_IDS.ACCT_CURRENT_ASSETS } }),
        prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_1120_RECEIVABLE,   tenantId, code: '1120', name: n('ذمم مدينة',                   'Accounts Receivable'),       type: 'ASSET',     parentId: SEED_IDS.ACCT_CURRENT_ASSETS } }),
        prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_1130_INVENTORY,    tenantId, code: '1130', name: n('المخزون',                     'Inventory'),                 type: 'ASSET',     parentId: SEED_IDS.ACCT_CURRENT_ASSETS } }),
        prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_1140_PREPAID,      tenantId, code: '1140', name: n('مصروفات مدفوعة مقدماً',       'Prepaid Expenses'),          type: 'ASSET',     parentId: SEED_IDS.ACCT_CURRENT_ASSETS } }),
        // Non-Current Assets
        prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_1210_FIXED,        tenantId, code: '1210', name: n('الأصول الثابتة',              'Fixed Assets'),              type: 'ASSET',     parentId: SEED_IDS.ACCT_NON_CURRENT_ASSETS } }),
        prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_1220_DEPRECIATION, tenantId, code: '1220', name: n('مجمع الإهلاك',                'Accumulated Depreciation'),  type: 'ASSET',     parentId: SEED_IDS.ACCT_NON_CURRENT_ASSETS } }),
        // Current Liabilities
        prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_2110_PAYABLE,      tenantId, code: '2110', name: n('ذمم دائنة',                   'Accounts Payable'),          type: 'LIABILITY', parentId: SEED_IDS.ACCT_CURRENT_LIAB } }),
        prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_2120_ACCRUED,      tenantId, code: '2120', name: n('مصروفات مستحقة',              'Accrued Expenses'),          type: 'LIABILITY', parentId: SEED_IDS.ACCT_CURRENT_LIAB } }),
        prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_2130_SHORT_LOANS,  tenantId, code: '2130', name: n('قروض قصيرة الأجل',            'Short-term Loans'),          type: 'LIABILITY', parentId: SEED_IDS.ACCT_CURRENT_LIAB } }),
        prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_2140_VAT,          tenantId, code: '2140', name: n('ضريبة القيمة المضافة',         'VAT Payable'),               type: 'LIABILITY', parentId: SEED_IDS.ACCT_CURRENT_LIAB } }),
        // Non-Current Liabilities
        prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_2210_LONG_LOANS,   tenantId, code: '2210', name: n('قروض طويلة الأجل',            'Long-term Loans'),           type: 'LIABILITY', parentId: SEED_IDS.ACCT_NON_CURRENT_LIAB } }),
        // Equity
        prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_3100_OWNER_EQUITY, tenantId, code: '3100', name: n("حقوق صاحب العمل",             "Owner's Equity"),            type: 'EQUITY',    parentId: SEED_IDS.ACCT_EQUITY } }),
        prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_3200_RETAINED,     tenantId, code: '3200', name: n('الأرباح المحتجزة',            'Retained Earnings'),         type: 'EQUITY',    parentId: SEED_IDS.ACCT_EQUITY } }),
        // Revenue
        prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_4100_SALES_REV,   tenantId, code: '4100', name: n('إيرادات المبيعات',            'Sales Revenue'),             type: 'REVENUE',   parentId: SEED_IDS.ACCT_REVENUE } }),
        prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_4200_OTHER_REV,   tenantId, code: '4200', name: n('إيرادات أخرى',               'Other Revenue'),             type: 'REVENUE',   parentId: SEED_IDS.ACCT_REVENUE } }),
        // Cost of Sales
        prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_5100_COGS,        tenantId, code: '5100', name: n('تكلفة البضاعة المباعة',       'Cost of Goods Sold'),        type: 'EXPENSE',   parentId: SEED_IDS.ACCT_COST_OF_SALES } }),
        // Operating Expenses
        prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_6110_SALARIES,    tenantId, code: '6110', name: n('الرواتب والأجور',             'Salaries and Wages'),        type: 'EXPENSE',   parentId: SEED_IDS.ACCT_OPERATING_EXP } }),
        prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_6120_RENT,        tenantId, code: '6120', name: n('مصروف الإيجار',              'Rent Expense'),              type: 'EXPENSE',   parentId: SEED_IDS.ACCT_OPERATING_EXP } }),
        prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_6130_UTILITIES,   tenantId, code: '6130', name: n('مصروف المرافق',              'Utilities Expense'),         type: 'EXPENSE',   parentId: SEED_IDS.ACCT_OPERATING_EXP } }),
        prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_6140_TRANSPORT,   tenantId, code: '6140', name: n('مصروف النقل',                'Transportation Expense'),    type: 'EXPENSE',   parentId: SEED_IDS.ACCT_OPERATING_EXP } }),
        // Administrative Expenses
        prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_6210_OFFICE,      tenantId, code: '6210', name: n('مستلزمات مكتبية',            'Office Supplies'),           type: 'EXPENSE',   parentId: SEED_IDS.ACCT_ADMIN_EXP } }),
        prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_6220_MAINTENANCE, tenantId, code: '6220', name: n('الصيانة والإصلاحات',          'Maintenance and Repairs'),   type: 'EXPENSE',   parentId: SEED_IDS.ACCT_ADMIN_EXP } }),
        prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_6230_MISC,        tenantId, code: '6230', name: n('مصروفات متنوعة',             'Miscellaneous Expense'),     type: 'EXPENSE',   parentId: SEED_IDS.ACCT_ADMIN_EXP } }),
    ])
}
