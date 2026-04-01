import 'dotenv/config';
import { PrismaClient } from '../../generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

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
            where: { slug: 'demo-shop' },
        });

        if (existingTenant) {
            console.log('⏭️  Seed data already exists, skipping...');
            return;
        }

        // ── 1. Tenant ──────────────────────────────────────────────────────────
        console.log('  → Creating tenant...');
        const tenant = await prisma.tenant.create({
            data: {
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
        const [adminRole, accountantRole, warehouseRole, salesRole] =
            await Promise.all([
                prisma.role.create({ data: { ...tid(T), name: 'Admin', description: 'Full system access', isSystem: true } }),
                prisma.role.create({ data: { ...tid(T), name: 'Accountant', description: 'Accounting and finance access', isSystem: true } }),
                prisma.role.create({ data: { ...tid(T), name: 'Warehouse', description: 'Inventory and warehouse access', isSystem: true } }),
                prisma.role.create({ data: { ...tid(T), name: 'Sales', description: 'Sales and customer management', isSystem: true } }),
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
                    ...tid(T),
                    email: 'admin@demo-shop.com',
                    passwordHash: adminHash,
                    fullName: 'Admin User',
                    userRoles: { create: { roleId: adminRole.id } },
                },
            }),
            prisma.appUser.create({
                data: {
                    ...tid(T),
                    email: 'accountant@demo-shop.com',
                    passwordHash: userHash,
                    fullName: 'Sara Al-Amin',
                    userRoles: { create: { roleId: accountantRole.id } },
                },
            }),
            prisma.appUser.create({
                data: {
                    ...tid(T),
                    email: 'warehouse@demo-shop.com',
                    passwordHash: userHash,
                    fullName: 'Khalid Barakat',
                    userRoles: { create: { roleId: warehouseRole.id } },
                },
            }),
            prisma.appUser.create({
                data: {
                    ...tid(T),
                    email: 'sales@demo-shop.com',
                    passwordHash: userHash,
                    fullName: 'Lina Nasser',
                    userRoles: { create: { roleId: salesRole.id } },
                },
            }),
        ]);

        // ── 4. Currencies ──────────────────────────────────────────────────────
        console.log('  → Creating currencies...');
        const [syp, usd] = await Promise.all([
            prisma.currency.create({ data: { ...tid(T), code: 'SYP', name: 'Syrian Pound', symbol: '£', isBase: true } }),
            prisma.currency.create({ data: { ...tid(T), code: 'USD', name: 'US Dollar', symbol: '$' } }),
        ]);
        void usd; // available for future invoice seeding

        // ── 5. Fiscal Period ───────────────────────────────────────────────────
        console.log('  → Creating fiscal period...');
        const year = new Date().getFullYear();
        const fiscalPeriod = await prisma.fiscalPeriod.create({
            data: {
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
                { ...tid(T), documentType: 'PURCHASE_INVOICE', prefix: 'PUR', padding: 5 },
                { ...tid(T), documentType: 'SALES_INVOICE',    prefix: 'SAL', padding: 5 },
                { ...tid(T), documentType: 'PAYMENT',          prefix: 'PAY', padding: 5 },
                { ...tid(T), documentType: 'RECEIPT',          prefix: 'REC', padding: 5 },
                { ...tid(T), documentType: 'EXPENSE',          prefix: 'EXP', padding: 5 },
                { ...tid(T), documentType: 'STOCK_COUNT',      prefix: 'SCT', padding: 5 },
                { ...tid(T), documentType: 'JOURNAL_ENTRY',    prefix: 'JE',  padding: 5 },
            ],
        });

        // ── 7. Chart of Accounts ───────────────────────────────────────────────
        console.log('  → Building chart of accounts...');

        // Level 1 — root groups
        const [grpAssets, grpLiabilities, grpEquity, grpRevenue, grpCostOfSales, grpExpenses] =
            await Promise.all([
                prisma.chartOfAccount.create({ data: { ...tid(T), code: '1000', name: 'Assets',         type: 'ASSET' } }),
                prisma.chartOfAccount.create({ data: { ...tid(T), code: '2000', name: 'Liabilities',    type: 'LIABILITY' } }),
                prisma.chartOfAccount.create({ data: { ...tid(T), code: '3000', name: 'Equity',         type: 'EQUITY' } }),
                prisma.chartOfAccount.create({ data: { ...tid(T), code: '4000', name: 'Revenue',        type: 'REVENUE' } }),
                prisma.chartOfAccount.create({ data: { ...tid(T), code: '5000', name: 'Cost of Sales',  type: 'EXPENSE' } }),
                prisma.chartOfAccount.create({ data: { ...tid(T), code: '6000', name: 'Expenses',       type: 'EXPENSE' } }),
            ]);

        // Level 2 — sub-groups
        const [grpCurrentAssets, grpFixedAssets,
               grpCurrentLiab, grpLongTermLiab,
               grpOperatingExp, grpAdminExp] =
            await Promise.all([
                prisma.chartOfAccount.create({ data: { ...tid(T), code: '1100', name: 'Current Assets',         type: 'ASSET',     parentId: grpAssets.id } }),
                prisma.chartOfAccount.create({ data: { ...tid(T), code: '1200', name: 'Non-Current Assets',     type: 'ASSET',     parentId: grpAssets.id } }),
                prisma.chartOfAccount.create({ data: { ...tid(T), code: '2100', name: 'Current Liabilities',    type: 'LIABILITY', parentId: grpLiabilities.id } }),
                prisma.chartOfAccount.create({ data: { ...tid(T), code: '2200', name: 'Non-Current Liabilities',type: 'LIABILITY', parentId: grpLiabilities.id } }),
                prisma.chartOfAccount.create({ data: { ...tid(T), code: '6100', name: 'Operating Expenses',     type: 'EXPENSE',   parentId: grpExpenses.id } }),
                prisma.chartOfAccount.create({ data: { ...tid(T), code: '6200', name: 'Administrative Expenses',type: 'EXPENSE',   parentId: grpExpenses.id } }),
            ]);

        // Level 3 — leaf accounts (the ones modules write journal lines against)
        const accounts = await Promise.all([
            // ── Current Assets
            prisma.chartOfAccount.create({ data: { ...tid(T), code: '1110', name: 'Cash and Cash Equivalents', type: 'ASSET',     parentId: grpCurrentAssets.id } }),
            prisma.chartOfAccount.create({ data: { ...tid(T), code: '1120', name: 'Accounts Receivable',       type: 'ASSET',     parentId: grpCurrentAssets.id } }),
            prisma.chartOfAccount.create({ data: { ...tid(T), code: '1130', name: 'Inventory',                 type: 'ASSET',     parentId: grpCurrentAssets.id } }),
            prisma.chartOfAccount.create({ data: { ...tid(T), code: '1140', name: 'Prepaid Expenses',          type: 'ASSET',     parentId: grpCurrentAssets.id } }),
            // ── Non-Current Assets
            prisma.chartOfAccount.create({ data: { ...tid(T), code: '1210', name: 'Fixed Assets',              type: 'ASSET',     parentId: grpFixedAssets.id } }),
            prisma.chartOfAccount.create({ data: { ...tid(T), code: '1220', name: 'Accumulated Depreciation',  type: 'ASSET',     parentId: grpFixedAssets.id } }),
            // ── Current Liabilities
            prisma.chartOfAccount.create({ data: { ...tid(T), code: '2110', name: 'Accounts Payable',          type: 'LIABILITY', parentId: grpCurrentLiab.id } }),
            prisma.chartOfAccount.create({ data: { ...tid(T), code: '2120', name: 'Accrued Expenses',          type: 'LIABILITY', parentId: grpCurrentLiab.id } }),
            prisma.chartOfAccount.create({ data: { ...tid(T), code: '2130', name: 'Short-term Loans',          type: 'LIABILITY', parentId: grpCurrentLiab.id } }),
            prisma.chartOfAccount.create({ data: { ...tid(T), code: '2140', name: 'VAT Payable',               type: 'LIABILITY', parentId: grpCurrentLiab.id } }),
            // ── Non-Current Liabilities
            prisma.chartOfAccount.create({ data: { ...tid(T), code: '2210', name: 'Long-term Loans',           type: 'LIABILITY', parentId: grpLongTermLiab.id } }),
            // ── Equity
            prisma.chartOfAccount.create({ data: { ...tid(T), code: '3100', name: "Owner's Equity",            type: 'EQUITY',    parentId: grpEquity.id } }),
            prisma.chartOfAccount.create({ data: { ...tid(T), code: '3200', name: 'Retained Earnings',         type: 'EQUITY',    parentId: grpEquity.id } }),
            // ── Revenue
            prisma.chartOfAccount.create({ data: { ...tid(T), code: '4100', name: 'Sales Revenue',             type: 'REVENUE',   parentId: grpRevenue.id } }),
            prisma.chartOfAccount.create({ data: { ...tid(T), code: '4200', name: 'Other Revenue',             type: 'REVENUE',   parentId: grpRevenue.id } }),
            // ── Cost of Sales
            prisma.chartOfAccount.create({ data: { ...tid(T), code: '5100', name: 'Cost of Goods Sold',        type: 'EXPENSE',   parentId: grpCostOfSales.id } }),
            // ── Operating Expenses
            prisma.chartOfAccount.create({ data: { ...tid(T), code: '6110', name: 'Salaries and Wages',        type: 'EXPENSE',   parentId: grpOperatingExp.id } }),
            prisma.chartOfAccount.create({ data: { ...tid(T), code: '6120', name: 'Rent Expense',              type: 'EXPENSE',   parentId: grpOperatingExp.id } }),
            prisma.chartOfAccount.create({ data: { ...tid(T), code: '6130', name: 'Utilities Expense',         type: 'EXPENSE',   parentId: grpOperatingExp.id } }),
            prisma.chartOfAccount.create({ data: { ...tid(T), code: '6140', name: 'Transportation Expense',    type: 'EXPENSE',   parentId: grpOperatingExp.id } }),
            // ── Administrative Expenses
            prisma.chartOfAccount.create({ data: { ...tid(T), code: '6210', name: 'Office Supplies',           type: 'EXPENSE',   parentId: grpAdminExp.id } }),
            prisma.chartOfAccount.create({ data: { ...tid(T), code: '6220', name: 'Maintenance and Repairs',   type: 'EXPENSE',   parentId: grpAdminExp.id } }),
            prisma.chartOfAccount.create({ data: { ...tid(T), code: '6230', name: 'Miscellaneous Expense',     type: 'EXPENSE',   parentId: grpAdminExp.id } }),
        ]);

        // Named references for later use in invoice types / cashbox
        const acCash        = accounts.find(a => a.code === '1110')!;
        const acReceivable  = accounts.find(a => a.code === '1120')!;
        const acInventory   = accounts.find(a => a.code === '1130')!;
        const acPayable     = accounts.find(a => a.code === '2110')!;
        const acSalesRev    = accounts.find(a => a.code === '4100')!;
        const acCOGS        = accounts.find(a => a.code === '5100')!;
        // Suppress unused-variable warnings — these are available for future journal-entry seeding
        void acReceivable; void acInventory; void acPayable; void acSalesRev; void acCOGS;

        // ── 8. Item Categories ─────────────────────────────────────────────────
        console.log('  → Creating item categories...');
        const [catElectronics, catClothing, catFood, catHome, catOffice] =
            await Promise.all([
                prisma.itemCategory.create({ data: { ...tid(T), name: 'Electronics',     description: 'Electronic devices and accessories' } }),
                prisma.itemCategory.create({ data: { ...tid(T), name: 'Clothing',        description: 'Apparel and textiles' } }),
                prisma.itemCategory.create({ data: { ...tid(T), name: 'Food & Beverages',description: 'Food products and drinks' } }),
                prisma.itemCategory.create({ data: { ...tid(T), name: 'Home & Garden',   description: 'Household and garden items' } }),
                prisma.itemCategory.create({ data: { ...tid(T), name: 'Office Supplies', description: 'Stationery and office materials' } }),
            ]);

        // ── 9. Units ───────────────────────────────────────────────────────────
        console.log('  → Creating units...');
        const [unitPcs, unitKg, unitLiter, unitMeter, unitBox, unitDozen, unitPack] =
            await Promise.all([
                prisma.unit.create({ data: { ...tid(T), name: 'Piece',  abbreviation: 'pcs' } }),
                prisma.unit.create({ data: { ...tid(T), name: 'Kilogram', abbreviation: 'kg' } }),
                prisma.unit.create({ data: { ...tid(T), name: 'Liter',  abbreviation: 'L' } }),
                prisma.unit.create({ data: { ...tid(T), name: 'Meter',  abbreviation: 'm' } }),
                prisma.unit.create({ data: { ...tid(T), name: 'Box',    abbreviation: 'box' } }),
                prisma.unit.create({ data: { ...tid(T), name: 'Dozen',  abbreviation: 'doz' } }),
                prisma.unit.create({ data: { ...tid(T), name: 'Pack',   abbreviation: 'pack' } }),
            ]);
        void unitDozen; void unitPack; // available for future item seeding

        // ── 10. Items ──────────────────────────────────────────────────────────
        console.log('  → Creating items...');
        await Promise.all([
            prisma.item.create({ data: { ...tid(T), code: 'ELEC-001', name: 'Laptop 15"',         categoryId: catElectronics.id, baseUnitId: unitPcs.id,   defaultSellingPrice: 750000, latestPurchasePrice: 600000 } }),
            prisma.item.create({ data: { ...tid(T), code: 'ELEC-002', name: 'Smartphone',          categoryId: catElectronics.id, baseUnitId: unitPcs.id,   defaultSellingPrice: 350000, latestPurchasePrice: 280000 } }),
            prisma.item.create({ data: { ...tid(T), code: 'CLTH-001', name: "Men's T-Shirt",       categoryId: catClothing.id,    baseUnitId: unitPcs.id,   defaultSellingPrice: 8000,   latestPurchasePrice: 5000 } }),
            prisma.item.create({ data: { ...tid(T), code: 'CLTH-002', name: 'Fabric (Cotton)',     categoryId: catClothing.id,    baseUnitId: unitMeter.id, defaultSellingPrice: 4000,   latestPurchasePrice: 2500 } }),
            prisma.item.create({ data: { ...tid(T), code: 'FOOD-001', name: 'Rice (Local)',        categoryId: catFood.id,        baseUnitId: unitKg.id,    defaultSellingPrice: 3500,   latestPurchasePrice: 2800 } }),
            prisma.item.create({ data: { ...tid(T), code: 'FOOD-002', name: 'Cooking Oil 1L',      categoryId: catFood.id,        baseUnitId: unitLiter.id, defaultSellingPrice: 12000,  latestPurchasePrice: 9500 } }),
            prisma.item.create({ data: { ...tid(T), code: 'FOOD-003', name: 'Bottled Water 1.5L', categoryId: catFood.id,        baseUnitId: unitPcs.id,   defaultSellingPrice: 500,    latestPurchasePrice: 350 } }),
            prisma.item.create({ data: { ...tid(T), code: 'HOME-001', name: 'Cleaning Detergent', categoryId: catHome.id,        baseUnitId: unitBox.id,   defaultSellingPrice: 6000,   latestPurchasePrice: 4500 } }),
            prisma.item.create({ data: { ...tid(T), code: 'OFFC-001', name: 'A4 Copy Paper',       categoryId: catOffice.id,      baseUnitId: unitBox.id,   defaultSellingPrice: 22000,  latestPurchasePrice: 18000 } }),
            prisma.item.create({ data: { ...tid(T), code: 'OFFC-002', name: 'Ballpoint Pen',       categoryId: catOffice.id,      baseUnitId: unitPcs.id,   defaultSellingPrice: 500,    latestPurchasePrice: 250 } }),
        ]);

        // ── 11. Parties ────────────────────────────────────────────────────────
        console.log('  → Creating parties...');
        await Promise.all([
            prisma.party.create({ data: { ...tid(T), code: 'CUST-001', name: 'Ahmad Al-Hassan',       type: 'CUSTOMER',          phone: '+963-933-111222', email: 'ahmad@example.com',    address: 'Damascus, Mazzeh' } }),
            prisma.party.create({ data: { ...tid(T), code: 'CUST-002', name: 'Nour Trading Co.',      type: 'CUSTOMER',          phone: '+963-944-333444', email: 'nour@trading.sy',       address: 'Aleppo, Al-Azizieh' } }),
            prisma.party.create({ data: { ...tid(T), code: 'CUST-003', name: 'Rima Habash',           type: 'CUSTOMER_SUPPLIER', phone: '+963-955-555666', email: 'rima@example.com',      address: 'Latakia, Corniche' } }),
            prisma.party.create({ data: { ...tid(T), code: 'SUPP-001', name: 'Damascus Import Co.',   type: 'SUPPLIER',          phone: '+963-11-9876543', email: 'info@damsimport.sy',    address: 'Damascus, Industrial Zone' } }),
            prisma.party.create({ data: { ...tid(T), code: 'SUPP-002', name: 'Halabi Wholesale Ltd.',  type: 'SUPPLIER',          phone: '+963-21-8765432', email: 'sales@halabiwholesale.sy', address: 'Aleppo, Trade Quarter' } }),
        ]);

        // ── 12. Warehouses ─────────────────────────────────────────────────────
        console.log('  → Creating warehouses...');
        await Promise.all([
            prisma.warehouse.create({ data: { ...tid(T), code: 'WH-MAIN', name: 'Main Warehouse', address: 'Damascus Industrial Zone' } }),
            prisma.warehouse.create({ data: { ...tid(T), code: 'WH-SHOW', name: 'Showroom',       address: 'Damascus City Center' } }),
        ]);

        // ── 13. Cashboxes ──────────────────────────────────────────────────────
        console.log('  → Creating cashboxes...');
        await Promise.all([
            prisma.cashbox.create({ data: { ...tid(T), code: 'CASH-SYP', name: 'Main Cash (SYP)', currencyId: syp.id } }),
            prisma.cashbox.create({ data: { ...tid(T), code: 'CASH-USD', name: 'USD Cash Box',    currencyId: usd.id } }),
        ]);
        void acCash; // acCash is the GL account that maps to these cashboxes

        // ── 14. Invoice Types ──────────────────────────────────────────────────
        console.log('  → Creating invoice types...');
        await Promise.all([
            prisma.invoiceType.create({ data: { ...tid(T), code: 'PINV', name: 'Purchase Invoice',       direction: 'PURCHASE', affectsStock: true } }),
            prisma.invoiceType.create({ data: { ...tid(T), code: 'SINV', name: 'Sales Invoice',          direction: 'SALE',     affectsStock: true } }),
            prisma.invoiceType.create({ data: { ...tid(T), code: 'PRET', name: 'Purchase Return',        direction: 'SALE',     affectsStock: true } }),
            prisma.invoiceType.create({ data: { ...tid(T), code: 'SRET', name: 'Sales Return',           direction: 'PURCHASE', affectsStock: true } }),
            prisma.invoiceType.create({ data: { ...tid(T), code: 'CONS', name: 'Internal Consumption',   direction: 'SALE',     affectsStock: true } }),
        ]);

        // ── 15. Opening Journal Entry ──────────────────────────────────────────
        console.log('  → Creating opening journal entry...');
        const acOwnerEquity = accounts.find(a => a.code === '3100')!;
        await prisma.journalEntry.create({
            data: {
                ...tid(T),
                number: 'JE-00001',
                date: new Date(`${year}-01-01`),
                fiscalPeriodId: fiscalPeriod.id,
                referenceType: 'opening',
                description: 'Opening balance entry',
                status: 'POSTED',
                postedAt: new Date(`${year}-01-01`),
                createdBy: 'seed',
                lines: {
                    create: [
                        // Cash opening balance: 5,000,000 SYP
                        { ...tid(T), accountId: acCash.id,       debit: 5000000, credit: 0,       description: 'Opening cash balance',      sortOrder: 1 },
                        // Inventory opening balance: 10,000,000 SYP
                        { ...tid(T), accountId: acInventory.id,  debit: 10000000, credit: 0,      description: 'Opening inventory balance', sortOrder: 2 },
                        // Owner equity: 15,000,000 SYP
                        { ...tid(T), accountId: acOwnerEquity.id, debit: 0, credit: 15000000,     description: "Opening owner's equity",    sortOrder: 3 },
                    ],
                },
            },
        });

        // ── Done ───────────────────────────────────────────────────────────────
        console.log('');
        console.log('✅ Seed completed successfully!');
        console.log('');
        console.log('  Tenant  : Demo Shop  (slug: demo-shop)');
        console.log('  Users   : admin@demo-shop.com / admin123');
        console.log('            accountant@demo-shop.com / user123');
        console.log('            warehouse@demo-shop.com  / user123');
        console.log('            sales@demo-shop.com      / user123');
        console.log('  Accounts: 29 chart-of-accounts entries (6 groups, 6 sub-groups, 17 leaf accounts)');
        console.log('  Items   : 10 sample items across 5 categories');
        console.log('  Parties : 3 customers / 2 suppliers');
        console.log('  Warehouses: 2  |  Cashboxes: 2  |  Invoice types: 5');
        console.log('  Opening JE: 5,000,000 SYP cash + 10,000,000 SYP inventory');
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