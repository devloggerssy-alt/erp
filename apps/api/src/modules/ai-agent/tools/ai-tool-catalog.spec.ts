import { Reflector } from '@nestjs/core';
import { ALL_PERMISSIONS } from '@devloggers/api-contracts';
import type { AiToolContext, AiToolSource } from '@devloggers/backend-core';
import { AiToolRegistry } from './ai-tool-registry';
import { MetaToolsProvider } from './meta-tools.provider';
import { UnitsAiTools } from '../../catalog/units/units.ai-tools';
import { ItemsAiTools } from '../../catalog/items/items.ai-tools';
import { BrandsAiTools } from '../../catalog/brands/brands.ai-tools';
import { ItemCategoriesAiTools } from '../../catalog/item-categories/item-categories.ai-tools';
import { TagsAiTools } from '../../catalog/tags/tags.ai-tools';
import { PartiesAiTools } from '../../parties/parties.ai-tools';
import { SuppliersAiTools } from '../../parties/suppliers.ai-tools';
import { WarehousesAiTools } from '../../inventory/warehouses/warehouses.ai-tools';
import { InventoryAiTools } from '../../inventory/inventory.ai-tools';
import { StockLedgerAiTools } from '../../inventory/stock-ledger/stock-ledger.ai-tools';
import { CashboxesAiTools } from '../../invoicing/cashboxes/cashboxes.ai-tools';
import { BankAccountsAiTools } from '../../invoicing/bank-accounts/bank-accounts.ai-tools';
import { InvoiceTypesAiTools } from '../../invoicing/invoice-types/invoice-types.ai-tools';
import { InvoicesAiTools } from '../../invoicing/invoices/invoices.ai-tools';
import { ExpensesAiTools } from '../../invoicing/expenses/expenses.ai-tools';
import { PaymentsAiTools } from '../../invoicing/payments/payments.ai-tools';
import { CurrenciesAiTools } from '../../accounting/currencies/currencies.ai-tools';
import { ReportsAiTools } from '../../reports/reports.ai-tools';

const stub = {} as never;

function buildRegistry(): AiToolRegistry {
    const providers: AiToolSource[] = [
        new MetaToolsProvider(stub),
        new UnitsAiTools(stub), new ItemsAiTools(stub), new BrandsAiTools(stub), new ItemCategoriesAiTools(stub), new TagsAiTools(stub),
        new PartiesAiTools(stub), new SuppliersAiTools(stub),
        new WarehousesAiTools(stub), new InventoryAiTools(stub), new StockLedgerAiTools(stub),
        new CashboxesAiTools(stub), new BankAccountsAiTools(stub), new InvoiceTypesAiTools(stub),
        new InvoicesAiTools(stub, stub), new ExpensesAiTools(stub), new PaymentsAiTools(stub),
        new CurrenciesAiTools(stub),
        new ReportsAiTools(stub),
    ];
    const wrappers = providers.map((instance) => ({ metatype: instance.constructor, instance, isDependencyTreeStatic: () => true }));
    const registry = new AiToolRegistry({ getProviders: () => wrappers } as never, new Reflector());
    registry.onApplicationBootstrap();
    return registry;
}

describe('AI tool catalog', () => {
    const registry = buildRegistry();
    const admin: AiToolContext = { tenantId: 't', userId: 'u', permissions: new Set<string>(ALL_PERMISSIONS), locale: 'en', conversationId: 'c' };
    const all = registry.forUser(admin, registry.availableDomains(admin));

    it('registers every tool (14 from phase 1 + 53 new)', () => {
        expect(all).toHaveLength(67);
    });

    it('uses only permission keys from the catalog', () => {
        for (const tool of all) expect(ALL_PERMISSIONS).toContain(tool.permission);
    });

    it('allows delete only for brands, item categories and tags', () => {
        expect(all.filter((t) => t.name.endsWith('.delete')).map((t) => t.name).sort()).toEqual(
            ['brands.delete', 'item-categories.delete', 'tags.delete'],
        );
    });

    it('keeps every invoicing document, stock and report tool read-only', () => {
        const readOnly = /^(invoices|expenses|payments|stock|reports)\./;
        for (const tool of all.filter((t) => readOnly.test(t.name))) expect(tool.risk).toBe('read');
    });

    it('offers reports without tools.load, but not invoicing', () => {
        const names = registry.forUser(admin, []).map((t) => t.name);
        expect(names).toContain('reports.sales-summary');
        expect(names).not.toContain('invoices.list');
        expect(names).toHaveLength(39);
    });

    it('hides tools the user lacks permission for', () => {
        const cashier: AiToolContext = { ...admin, permissions: new Set<string>(['ai.use', 'items.view']) };
        expect(registry.forUser(cashier, registry.availableDomains(cashier)).map((t) => t.name).sort()).toEqual(
            ['items.list', 'items.show', 'tools.load', 'tools.search'],
        );
    });
});
