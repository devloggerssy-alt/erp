import 'dotenv/config';
import { PrismaClient } from '../../generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import { SEED_IDS } from './seed-ids';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tid(tenantId: string) {
    return { tenantId };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('🚀 Starting database seeding...');

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    try {
        const existingTenant = await prisma.tenant.findUnique({
            where: { id: SEED_IDS.TENANT },
        });

        if (existingTenant) {
            console.log('⏭️  Seed data already exists, skipping...');
            return;
        }

        // ── 1. Tenant ──────────────────────────────────────────────────────────
        console.log('  → Creating tenant...');
        const tenant = await prisma.tenant.create({
            data: {
                id: SEED_IDS.TENANT,
                name: 'Demo Shop',
                slug: 'demo-shop',
                email: 'admin@demo-shop.com',
                phone: '+963-11-1234567',
                address: 'Damascus, Syria',
            },
        });
        const T = tenant.id;

        // ── 2. Roles ───────────────────────────────────────────────────────────
        console.log('  → Creating roles...');
        await Promise.all([
            prisma.role.create({ data: { id: SEED_IDS.ROLE_ADMIN, ...tid(T), name: 'Admin', description: 'Full system access', isSystem: true } }),
            prisma.role.create({ data: { id: SEED_IDS.ROLE_ACCOUNTANT, ...tid(T), name: 'Accountant', description: 'Accounting and finance access', isSystem: true } }),
            prisma.role.create({ data: { id: SEED_IDS.ROLE_WAREHOUSE, ...tid(T), name: 'Warehouse', description: 'Inventory and warehouse access', isSystem: true } }),
            prisma.role.create({ data: { id: SEED_IDS.ROLE_SALES, ...tid(T), name: 'Sales', description: 'Sales and customer management', isSystem: true } }),
        ]);

        // ── 3. Users ───────────────────────────────────────────────────────────
        console.log('  → Creating users...');
        const [adminHash, userHash] = await Promise.all([
            bcrypt.hash('admin123', 10),
            bcrypt.hash('user123', 10),
        ]);

        await Promise.all([
            prisma.appUser.create({
                data: {
                    id: SEED_IDS.USER_ADMIN,
                    ...tid(T),
                    email: 'admin@demo-shop.com',
                    passwordHash: adminHash,
                    fullName: 'Admin User',
                    userRoles: { create: { roleId: SEED_IDS.ROLE_ADMIN } },
                },
            }),
            prisma.appUser.create({
                data: {
                    id: SEED_IDS.USER_ACCOUNTANT,
                    ...tid(T),
                    email: 'accountant@demo-shop.com',
                    passwordHash: userHash,
                    fullName: 'Sara Al-Amin',
                    userRoles: { create: { roleId: SEED_IDS.ROLE_ACCOUNTANT } },
                },
            }),
            prisma.appUser.create({
                data: {
                    id: SEED_IDS.USER_WAREHOUSE,
                    ...tid(T),
                    email: 'warehouse@demo-shop.com',
                    passwordHash: userHash,
                    fullName: 'Khalid Barakat',
                    userRoles: { create: { roleId: SEED_IDS.ROLE_WAREHOUSE } },
                },
            }),
            prisma.appUser.create({
                data: {
                    id: SEED_IDS.USER_SALES,
                    ...tid(T),
                    email: 'sales@demo-shop.com',
                    passwordHash: userHash,
                    fullName: 'Lina Nasser',
                    userRoles: { create: { roleId: SEED_IDS.ROLE_SALES } },
                },
            }),
        ]);

        // ── 4. Currencies ──────────────────────────────────────────────────────
        console.log('  → Creating currencies...');
        await Promise.all([
            prisma.currency.create({ data: { id: SEED_IDS.CURRENCY_SYP, ...tid(T), code: 'SYP', name: 'Syrian Pound', symbol: '£', isBase: true } }),
            prisma.currency.create({ data: { id: SEED_IDS.CURRENCY_USD, ...tid(T), code: 'USD', name: 'US Dollar', symbol: '$' } }),
        ]);

        // ── 5. Fiscal Period ───────────────────────────────────────────────────
        console.log('  → Creating fiscal period...');
        const year = new Date().getFullYear();
        await prisma.fiscalPeriod.create({
            data: {
                id: SEED_IDS.FISCAL_PERIOD_2026,
                ...tid(T),
                name: String(year),
                startDate: new Date(`${year}-01-01`),
                endDate: new Date(`${year}-12-31`),
                status: 'OPEN',
            },
        });

        // ── 6. Document Sequences ──────────────────────────────────────────────
        console.log('  → Creating document sequences...');
        await prisma.documentSequence.createMany({
            data: [
                { id: SEED_IDS.DOC_SEQ_PURCHASE, ...tid(T), documentType: 'PURCHASE_INVOICE', prefix: 'PUR', padding: 5 },
                { id: SEED_IDS.DOC_SEQ_SALES,    ...tid(T), documentType: 'SALES_INVOICE',    prefix: 'SAL', padding: 5 },
                { id: SEED_IDS.DOC_SEQ_PAYMENT,  ...tid(T), documentType: 'PAYMENT',          prefix: 'PAY', padding: 5 },
                { id: SEED_IDS.DOC_SEQ_RECEIPT,  ...tid(T), documentType: 'RECEIPT',          prefix: 'REC', padding: 5 },
                { id: SEED_IDS.DOC_SEQ_EXPENSE,  ...tid(T), documentType: 'EXPENSE',          prefix: 'EXP', padding: 5 },
                { id: SEED_IDS.DOC_SEQ_STOCK,    ...tid(T), documentType: 'STOCK_COUNT',      prefix: 'SCT', padding: 5 },
                { id: SEED_IDS.DOC_SEQ_JOURNAL,  ...tid(T), documentType: 'JOURNAL_ENTRY',    prefix: 'JE',  padding: 5 },
            ],
        });

        // ── 7. Chart of Accounts ───────────────────────────────────────────────
        console.log('  → Building chart of accounts...');

        // Level 1 — root groups
        await Promise.all([
            prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_ASSETS,        ...tid(T), code: '1000', name: 'Assets',         type: 'ASSET' } }),
            prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_LIABILITIES,   ...tid(T), code: '2000', name: 'Liabilities',    type: 'LIABILITY' } }),
            prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_EQUITY,        ...tid(T), code: '3000', name: 'Equity',         type: 'EQUITY' } }),
            prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_REVENUE,       ...tid(T), code: '4000', name: 'Revenue',        type: 'REVENUE' } }),
            prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_COST_OF_SALES, ...tid(T), code: '5000', name: 'Cost of Sales',  type: 'EXPENSE' } }),
            prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_EXPENSES,      ...tid(T), code: '6000', name: 'Expenses',       type: 'EXPENSE' } }),
        ]);

        // Level 2 — sub-groups
        await Promise.all([
            prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_CURRENT_ASSETS,     ...tid(T), code: '1100', name: 'Current Assets',         type: 'ASSET',     parentId: SEED_IDS.ACCT_ASSETS } }),
            prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_NON_CURRENT_ASSETS, ...tid(T), code: '1200', name: 'Non-Current Assets',     type: 'ASSET',     parentId: SEED_IDS.ACCT_ASSETS } }),
            prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_CURRENT_LIAB,       ...tid(T), code: '2100', name: 'Current Liabilities',    type: 'LIABILITY', parentId: SEED_IDS.ACCT_LIABILITIES } }),
            prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_NON_CURRENT_LIAB,   ...tid(T), code: '2200', name: 'Non-Current Liabilities',type: 'LIABILITY', parentId: SEED_IDS.ACCT_LIABILITIES } }),
            prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_OPERATING_EXP,      ...tid(T), code: '6100', name: 'Operating Expenses',     type: 'EXPENSE',   parentId: SEED_IDS.ACCT_EXPENSES } }),
            prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_ADMIN_EXP,          ...tid(T), code: '6200', name: 'Administrative Expenses',type: 'EXPENSE',   parentId: SEED_IDS.ACCT_EXPENSES } }),
        ]);

        // Level 3 — leaf accounts
        await Promise.all([
            // ── Current Assets
            prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_1110_CASH,            ...tid(T), code: '1110', name: 'Cash and Cash Equivalents', type: 'ASSET',     parentId: SEED_IDS.ACCT_CURRENT_ASSETS } }),
            prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_1120_RECEIVABLE,      ...tid(T), code: '1120', name: 'Accounts Receivable',       type: 'ASSET',     parentId: SEED_IDS.ACCT_CURRENT_ASSETS } }),
            prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_1130_INVENTORY,       ...tid(T), code: '1130', name: 'Inventory',                 type: 'ASSET',     parentId: SEED_IDS.ACCT_CURRENT_ASSETS } }),
            prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_1140_PREPAID,         ...tid(T), code: '1140', name: 'Prepaid Expenses',          type: 'ASSET',     parentId: SEED_IDS.ACCT_CURRENT_ASSETS } }),
            // ── Non-Current Assets
            prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_1210_FIXED,           ...tid(T), code: '1210', name: 'Fixed Assets',              type: 'ASSET',     parentId: SEED_IDS.ACCT_NON_CURRENT_ASSETS } }),
            prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_1220_DEPRECIATION,    ...tid(T), code: '1220', name: 'Accumulated Depreciation',  type: 'ASSET',     parentId: SEED_IDS.ACCT_NON_CURRENT_ASSETS } }),
            // ── Current Liabilities
            prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_2110_PAYABLE,         ...tid(T), code: '2110', name: 'Accounts Payable',          type: 'LIABILITY', parentId: SEED_IDS.ACCT_CURRENT_LIAB } }),
            prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_2120_ACCRUED,         ...tid(T), code: '2120', name: 'Accrued Expenses',          type: 'LIABILITY', parentId: SEED_IDS.ACCT_CURRENT_LIAB } }),
            prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_2130_SHORT_LOANS,     ...tid(T), code: '2130', name: 'Short-term Loans',          type: 'LIABILITY', parentId: SEED_IDS.ACCT_CURRENT_LIAB } }),
            prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_2140_VAT,             ...tid(T), code: '2140', name: 'VAT Payable',               type: 'LIABILITY', parentId: SEED_IDS.ACCT_CURRENT_LIAB } }),
            // ── Non-Current Liabilities
            prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_2210_LONG_LOANS,      ...tid(T), code: '2210', name: 'Long-term Loans',           type: 'LIABILITY', parentId: SEED_IDS.ACCT_NON_CURRENT_LIAB } }),
            // ── Equity
            prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_3100_OWNER_EQUITY,    ...tid(T), code: '3100', name: "Owner's Equity",            type: 'EQUITY',    parentId: SEED_IDS.ACCT_EQUITY } }),
            prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_3200_RETAINED,        ...tid(T), code: '3200', name: 'Retained Earnings',         type: 'EQUITY',    parentId: SEED_IDS.ACCT_EQUITY } }),
            // ── Revenue
            prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_4100_SALES_REV,       ...tid(T), code: '4100', name: 'Sales Revenue',             type: 'REVENUE',   parentId: SEED_IDS.ACCT_REVENUE } }),
            prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_4200_OTHER_REV,       ...tid(T), code: '4200', name: 'Other Revenue',             type: 'REVENUE',   parentId: SEED_IDS.ACCT_REVENUE } }),
            // ── Cost of Sales
            prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_5100_COGS,            ...tid(T), code: '5100', name: 'Cost of Goods Sold',        type: 'EXPENSE',   parentId: SEED_IDS.ACCT_COST_OF_SALES } }),
            // ── Operating Expenses
            prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_6110_SALARIES,        ...tid(T), code: '6110', name: 'Salaries and Wages',        type: 'EXPENSE',   parentId: SEED_IDS.ACCT_OPERATING_EXP } }),
            prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_6120_RENT,            ...tid(T), code: '6120', name: 'Rent Expense',              type: 'EXPENSE',   parentId: SEED_IDS.ACCT_OPERATING_EXP } }),
            prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_6130_UTILITIES,       ...tid(T), code: '6130', name: 'Utilities Expense',         type: 'EXPENSE',   parentId: SEED_IDS.ACCT_OPERATING_EXP } }),
            prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_6140_TRANSPORT,       ...tid(T), code: '6140', name: 'Transportation Expense',    type: 'EXPENSE',   parentId: SEED_IDS.ACCT_OPERATING_EXP } }),
            // ── Administrative Expenses
            prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_6210_OFFICE,          ...tid(T), code: '6210', name: 'Office Supplies',           type: 'EXPENSE',   parentId: SEED_IDS.ACCT_ADMIN_EXP } }),
            prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_6220_MAINTENANCE,     ...tid(T), code: '6220', name: 'Maintenance and Repairs',   type: 'EXPENSE',   parentId: SEED_IDS.ACCT_ADMIN_EXP } }),
            prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_6230_MISC,            ...tid(T), code: '6230', name: 'Miscellaneous Expense',     type: 'EXPENSE',   parentId: SEED_IDS.ACCT_ADMIN_EXP } }),
        ]);

        // ── 8. Item Categories ─────────────────────────────────────────────────
        console.log('  → Creating item categories...');
        await Promise.all([
            prisma.itemCategory.create({ data: { id: SEED_IDS.CAT_ELECTRONICS, ...tid(T), name: 'Electronics',     description: 'Electronic devices and accessories' } }),
            prisma.itemCategory.create({ data: { id: SEED_IDS.CAT_CLOTHING,    ...tid(T), name: 'Clothing',        description: 'Apparel and textiles' } }),
            prisma.itemCategory.create({ data: { id: SEED_IDS.CAT_FOOD,        ...tid(T), name: 'Food & Beverages',description: 'Food products and drinks' } }),
            prisma.itemCategory.create({ data: { id: SEED_IDS.CAT_HOME,        ...tid(T), name: 'Home & Garden',   description: 'Household and garden items' } }),
            prisma.itemCategory.create({ data: { id: SEED_IDS.CAT_OFFICE,      ...tid(T), name: 'Office Supplies', description: 'Stationery and office materials' } }),
        ]);

        // ── 9. Units ───────────────────────────────────────────────────────────
        console.log('  → Creating units...');
        await Promise.all([
            prisma.unit.create({ data: { id: SEED_IDS.UNIT_PIECE, ...tid(T), name: 'Piece',  abbreviation: 'pcs' } }),
            prisma.unit.create({ data: { id: SEED_IDS.UNIT_KG,    ...tid(T), name: 'Kilogram', abbreviation: 'kg' } }),
            prisma.unit.create({ data: { id: SEED_IDS.UNIT_LITER, ...tid(T), name: 'Liter',  abbreviation: 'L' } }),
            prisma.unit.create({ data: { id: SEED_IDS.UNIT_METER, ...tid(T), name: 'Meter',  abbreviation: 'm' } }),
            prisma.unit.create({ data: { id: SEED_IDS.UNIT_BOX,   ...tid(T), name: 'Box',    abbreviation: 'box' } }),
            prisma.unit.create({ data: { id: SEED_IDS.UNIT_DOZEN, ...tid(T), name: 'Dozen',  abbreviation: 'doz' } }),
            prisma.unit.create({ data: { id: SEED_IDS.UNIT_PACK,  ...tid(T), name: 'Pack',   abbreviation: 'pack' } }),
        ]);

        // ── 10. Items ──────────────────────────────────────────────────────────
        console.log('  → Creating items...');
        await Promise.all([
            prisma.item.create({ data: { id: SEED_IDS.ITEM_LAPTOP,     ...tid(T), code: 'ELEC-001', name: 'Laptop 15"',         categoryId: SEED_IDS.CAT_ELECTRONICS, baseUnitId: SEED_IDS.UNIT_PIECE,   defaultSellingPrice: 750000, latestPurchasePrice: 600000 } }),
            prisma.item.create({ data: { id: SEED_IDS.ITEM_SMARTPHONE, ...tid(T), code: 'ELEC-002', name: 'Smartphone',          categoryId: SEED_IDS.CAT_ELECTRONICS, baseUnitId: SEED_IDS.UNIT_PIECE,   defaultSellingPrice: 350000, latestPurchasePrice: 280000 } }),
            prisma.item.create({ data: { id: SEED_IDS.ITEM_TSHIRT,     ...tid(T), code: 'CLTH-001', name: "Men's T-Shirt",       categoryId: SEED_IDS.CAT_CLOTHING,    baseUnitId: SEED_IDS.UNIT_PIECE,   defaultSellingPrice: 8000,   latestPurchasePrice: 5000 } }),
            prisma.item.create({ data: { id: SEED_IDS.ITEM_FABRIC,     ...tid(T), code: 'CLTH-002', name: 'Fabric (Cotton)',     categoryId: SEED_IDS.CAT_CLOTHING,    baseUnitId: SEED_IDS.UNIT_METER, defaultSellingPrice: 4000,   latestPurchasePrice: 2500 } }),
            prisma.item.create({ data: { id: SEED_IDS.ITEM_RICE,       ...tid(T), code: 'FOOD-001', name: 'Rice (Local)',        categoryId: SEED_IDS.CAT_FOOD,        baseUnitId: SEED_IDS.UNIT_KG,    defaultSellingPrice: 3500,   latestPurchasePrice: 2800 } }),
            prisma.item.create({ data: { id: SEED_IDS.ITEM_OIL,        ...tid(T), code: 'FOOD-002', name: 'Cooking Oil 1L',      categoryId: SEED_IDS.CAT_FOOD,        baseUnitId: SEED_IDS.UNIT_LITER, defaultSellingPrice: 12000,  latestPurchasePrice: 9500 } }),
            prisma.item.create({ data: { id: SEED_IDS.ITEM_WATER,      ...tid(T), code: 'FOOD-003', name: 'Bottled Water 1.5L', categoryId: SEED_IDS.CAT_FOOD,        baseUnitId: SEED_IDS.UNIT_PIECE,   defaultSellingPrice: 500,    latestPurchasePrice: 350 } }),
            prisma.item.create({ data: { id: SEED_IDS.ITEM_DETERGENT,  ...tid(T), code: 'HOME-001', name: 'Cleaning Detergent', categoryId: SEED_IDS.CAT_HOME,        baseUnitId: SEED_IDS.UNIT_BOX,   defaultSellingPrice: 6000,   latestPurchasePrice: 4500 } }),
            prisma.item.create({ data: { id: SEED_IDS.ITEM_PAPER,      ...tid(T), code: 'OFFC-001', name: 'A4 Copy Paper',       categoryId: SEED_IDS.CAT_OFFICE,      baseUnitId: SEED_IDS.UNIT_BOX,   defaultSellingPrice: 22000,  latestPurchasePrice: 18000 } }),
            prisma.item.create({ data: { id: SEED_IDS.ITEM_PEN,        ...tid(T), code: 'OFFC-002', name: 'Ballpoint Pen',       categoryId: SEED_IDS.CAT_OFFICE,      baseUnitId: SEED_IDS.UNIT_PIECE,   defaultSellingPrice: 500,    latestPurchasePrice: 250 } }),
        ]);

        // ── 11. Parties ────────────────────────────────────────────────────────
        console.log('  → Creating parties...');
        await Promise.all([
            prisma.party.create({ data: { id: SEED_IDS.PARTY_AHMAD,    ...tid(T), code: 'CUST-001', name: 'Ahmad Al-Hassan',       type: 'CUSTOMER',          phone: '+963-933-111222', email: 'ahmad@example.com',    address: 'Damascus, Mazzeh' } }),
            prisma.party.create({ data: { id: SEED_IDS.PARTY_NOUR,     ...tid(T), code: 'CUST-002', name: 'Nour Trading Co.',      type: 'CUSTOMER',          phone: '+963-944-333444', email: 'nour@trading.sy',       address: 'Aleppo, Al-Azizieh' } }),
            prisma.party.create({ data: { id: SEED_IDS.PARTY_RIMA,     ...tid(T), code: 'CUST-003', name: 'Rima Habash',           type: 'CUSTOMER_SUPPLIER', phone: '+963-955-555666', email: 'rima@example.com',      address: 'Latakia, Corniche' } }),
            prisma.party.create({ data: { id: SEED_IDS.PARTY_DAMASCUS, ...tid(T), code: 'SUPP-001', name: 'Damascus Import Co.',   type: 'SUPPLIER',          phone: '+963-11-9876543', email: 'info@damsimport.sy',    address: 'Damascus, Industrial Zone' } }),
            prisma.party.create({ data: { id: SEED_IDS.PARTY_HALABI,   ...tid(T), code: 'SUPP-002', name: 'Halabi Wholesale Ltd.',  type: 'SUPPLIER',          phone: '+963-21-8765432', email: 'sales@halabiwholesale.sy', address: 'Aleppo, Trade Quarter' } }),
        ]);

        // ── 12. Warehouses ─────────────────────────────────────────────────────
        console.log('  → Creating warehouses...');
        await Promise.all([
            prisma.warehouse.create({ data: { id: SEED_IDS.WAREHOUSE_MAIN,     ...tid(T), code: 'WH-MAIN', name: 'Main Warehouse', address: 'Damascus Industrial Zone' } }),
            prisma.warehouse.create({ data: { id: SEED_IDS.WAREHOUSE_SHOWROOM, ...tid(T), code: 'WH-SHOW', name: 'Showroom',       address: 'Damascus City Center' } }),
        ]);

        // ── 13. Cashboxes ──────────────────────────────────────────────────────
        console.log('  → Creating cashboxes...');
        await Promise.all([
            prisma.cashbox.create({ data: { id: SEED_IDS.CASHBOX_SYP, ...tid(T), code: 'CASH-SYP', name: 'Main Cash (SYP)', currencyId: SEED_IDS.CURRENCY_SYP } }),
            prisma.cashbox.create({ data: { id: SEED_IDS.CASHBOX_USD, ...tid(T), code: 'CASH-USD', name: 'USD Cash Box',    currencyId: SEED_IDS.CURRENCY_USD } }),
        ]);

        // ── 14. Invoice Types ──────────────────────────────────────────────────
        console.log('  → Creating invoice types...');
        await Promise.all([
            prisma.invoiceType.create({ data: { id: SEED_IDS.INV_TYPE_PURCHASE,     ...tid(T), code: 'PINV', name: 'Purchase Invoice',       direction: 'PURCHASE', affectsStock: true } }),
            prisma.invoiceType.create({ data: { id: SEED_IDS.INV_TYPE_SALES,        ...tid(T), code: 'SINV', name: 'Sales Invoice',          direction: 'SALE',     affectsStock: true } }),
            prisma.invoiceType.create({ data: { id: SEED_IDS.INV_TYPE_PURCHASE_RET, ...tid(T), code: 'PRET', name: 'Purchase Return',        direction: 'SALE',     affectsStock: true } }),
            prisma.invoiceType.create({ data: { id: SEED_IDS.INV_TYPE_SALES_RET,    ...tid(T), code: 'SRET', name: 'Sales Return',           direction: 'PURCHASE', affectsStock: true } }),
            prisma.invoiceType.create({ data: { id: SEED_IDS.INV_TYPE_CONSUMPTION,  ...tid(T), code: 'CONS', name: 'Internal Consumption',   direction: 'SALE',     affectsStock: true } }),
        ]);

        // ── 15. Opening Journal Entry ──────────────────────────────────────────
        console.log('  → Creating opening journal entry...');
        await prisma.journalEntry.create({
            data: {
                id: SEED_IDS.JOURNAL_OPENING,
                ...tid(T),
                number: 'JE-00001',
                date: new Date(`${year}-01-01`),
                fiscalPeriodId: SEED_IDS.FISCAL_PERIOD_2026,
                referenceType: 'opening',
                description: 'Opening balance entry',
                status: 'POSTED',
                postedAt: new Date(`${year}-01-01`),
                createdBy: 'seed',
                lines: {
                    create: [
                        // Cash opening balance: 5,000,000 SYP
                        { ...tid(T), accountId: SEED_IDS.ACCT_1110_CASH,       debit: 5000000, credit: 0,       description: 'Opening cash balance',      sortOrder: 1 },
                        // Inventory opening balance: 10,000,000 SYP
                        { ...tid(T), accountId: SEED_IDS.ACCT_1130_INVENTORY,  debit: 10000000, credit: 0,      description: 'Opening inventory balance', sortOrder: 2 },
                        // Owner equity: 15,000,000 SYP
                        { ...tid(T), accountId: SEED_IDS.ACCT_3100_OWNER_EQUITY, debit: 0, credit: 15000000,     description: "Opening owner's equity",    sortOrder: 3 },
                    ],
                },
            },
        });

        // ── Done ───────────────────────────────────────────────────────────────
        console.log('');
        console.log('✅ Seed completed successfully!');
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

if (require.main === module) {
    main();
}

export const seed = main;