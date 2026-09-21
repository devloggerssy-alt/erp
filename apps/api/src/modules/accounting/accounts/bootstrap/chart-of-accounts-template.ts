import { AccountType } from '@devloggers/db-prisma';

export interface ChartOfAccountTemplateEntry {
    code: string;
    nameAr: string;
    nameEn: string;
    type: AccountType;
    parentCode?: string;
}

export const CHART_OF_ACCOUNTS_TEMPLATE: ChartOfAccountTemplateEntry[] = [
    // Level 1
    { code: '1000', nameAr: 'الأصول', nameEn: 'Assets', type: AccountType.ASSET },
    { code: '2000', nameAr: 'الالتزامات', nameEn: 'Liabilities', type: AccountType.LIABILITY },
    { code: '3000', nameAr: 'حقوق الملكية', nameEn: 'Equity', type: AccountType.EQUITY },
    { code: '4000', nameAr: 'الإيرادات', nameEn: 'Revenue', type: AccountType.REVENUE },
    { code: '5000', nameAr: 'تكلفة المبيعات', nameEn: 'Cost of Sales', type: AccountType.EXPENSE },
    { code: '6000', nameAr: 'المصروفات', nameEn: 'Expenses', type: AccountType.EXPENSE },
    // Level 2
    { code: '1100', nameAr: 'الأصول المتداولة', nameEn: 'Current Assets', type: AccountType.ASSET, parentCode: '1000' },
    { code: '1200', nameAr: 'الأصول غير المتداولة', nameEn: 'Non-Current Assets', type: AccountType.ASSET, parentCode: '1000' },
    { code: '2100', nameAr: 'الالتزامات المتداولة', nameEn: 'Current Liabilities', type: AccountType.LIABILITY, parentCode: '2000' },
    { code: '2200', nameAr: 'الالتزامات غير المتداولة', nameEn: 'Non-Current Liabilities', type: AccountType.LIABILITY, parentCode: '2000' },
    { code: '6100', nameAr: 'المصروفات التشغيلية', nameEn: 'Operating Expenses', type: AccountType.EXPENSE, parentCode: '6000' },
    { code: '6200', nameAr: 'المصروفات الإدارية', nameEn: 'Administrative Expenses', type: AccountType.EXPENSE, parentCode: '6000' },
    // Level 3 — Current Assets
    { code: '1110', nameAr: 'النقد وما في حكمه', nameEn: 'Cash and Cash Equivalents', type: AccountType.ASSET, parentCode: '1100' },
    { code: '1120', nameAr: 'ذمم مدينة', nameEn: 'Accounts Receivable', type: AccountType.ASSET, parentCode: '1100' },
    { code: '1130', nameAr: 'المخزون', nameEn: 'Inventory', type: AccountType.ASSET, parentCode: '1100' },
    { code: '1140', nameAr: 'مصروفات مدفوعة مقدماً', nameEn: 'Prepaid Expenses', type: AccountType.ASSET, parentCode: '1100' },
    { code: '1150', nameAr: 'البنوك', nameEn: 'Bank Accounts', type: AccountType.ASSET, parentCode: '1100' },
    // Level 3 — Non-Current Assets
    { code: '1210', nameAr: 'الأصول الثابتة', nameEn: 'Fixed Assets', type: AccountType.ASSET, parentCode: '1200' },
    { code: '1220', nameAr: 'مجمع الإهلاك', nameEn: 'Accumulated Depreciation', type: AccountType.ASSET, parentCode: '1200' },
    // Level 3 — Current Liabilities
    { code: '2110', nameAr: 'ذمم دائنة', nameEn: 'Accounts Payable', type: AccountType.LIABILITY, parentCode: '2100' },
    { code: '2120', nameAr: 'مصروفات مستحقة', nameEn: 'Accrued Expenses', type: AccountType.LIABILITY, parentCode: '2100' },
    { code: '2130', nameAr: 'قروض قصيرة الأجل', nameEn: 'Short-term Loans', type: AccountType.LIABILITY, parentCode: '2100' },
    { code: '2140', nameAr: 'ضريبة القيمة المضافة', nameEn: 'VAT Payable', type: AccountType.LIABILITY, parentCode: '2100' },
    // Level 3 — Non-Current Liabilities
    { code: '2210', nameAr: 'قروض طويلة الأجل', nameEn: 'Long-term Loans', type: AccountType.LIABILITY, parentCode: '2200' },
    // Level 3 — Equity
    { code: '3100', nameAr: "حقوق صاحب العمل", nameEn: "Owner's Equity", type: AccountType.EQUITY, parentCode: '3000' },
    { code: '3200', nameAr: 'الأرباح المحتجزة', nameEn: 'Retained Earnings', type: AccountType.EQUITY, parentCode: '3000' },
    // Level 3 — Revenue
    { code: '4100', nameAr: 'إيرادات المبيعات', nameEn: 'Sales Revenue', type: AccountType.REVENUE, parentCode: '4000' },
    { code: '4200', nameAr: 'إيرادات أخرى', nameEn: 'Other Revenue', type: AccountType.REVENUE, parentCode: '4000' },
    // Level 3 — Cost of Sales
    { code: '5100', nameAr: 'تكلفة البضاعة المباعة', nameEn: 'Cost of Goods Sold', type: AccountType.EXPENSE, parentCode: '5000' },
    { code: '5210', nameAr: 'تسويات المخزون', nameEn: 'Inventory Adjustments', type: AccountType.EXPENSE, parentCode: '5000' },
    // Level 3 — Operating Expenses
    { code: '6110', nameAr: 'الرواتب والأجور', nameEn: 'Salaries and Wages', type: AccountType.EXPENSE, parentCode: '6100' },
    { code: '6120', nameAr: 'مصروف الإيجار', nameEn: 'Rent Expense', type: AccountType.EXPENSE, parentCode: '6100' },
    { code: '6130', nameAr: 'مصروف المرافق', nameEn: 'Utilities Expense', type: AccountType.EXPENSE, parentCode: '6100' },
    { code: '6140', nameAr: 'مصروف النقل', nameEn: 'Transportation Expense', type: AccountType.EXPENSE, parentCode: '6100' },
    // Level 3 — Administrative Expenses
    { code: '6210', nameAr: 'مستلزمات مكتبية', nameEn: 'Office Supplies', type: AccountType.EXPENSE, parentCode: '6200' },
    { code: '6220', nameAr: 'الصيانة والإصلاحات', nameEn: 'Maintenance and Repairs', type: AccountType.EXPENSE, parentCode: '6200' },
    { code: '6230', nameAr: 'مصروفات متنوعة', nameEn: 'Miscellaneous Expense', type: AccountType.EXPENSE, parentCode: '6200' },
];
