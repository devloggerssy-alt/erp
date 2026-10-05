import type { AiTool, AiToolContext } from '@devloggers/backend-core';
import { StockLedgerAiTools } from './stock-ledger.ai-tools';

const ctx: AiToolContext = { tenantId: 'tenant-1', userId: 'user-1', permissions: new Set<string>(), locale: 'en', conversationId: 'conv-1' };

async function run(tool: AiTool, input: unknown): Promise<unknown> {
    const prepared = await tool.prepare(input);
    if (!prepared.ok) throw new Error(`invalid input: ${JSON.stringify(prepared.errors)}`);
    return prepared.run(ctx);
}

describe('StockLedgerAiTools', () => {
    const service = { findMovements: jest.fn() };
    const [movements] = new StockLedgerAiTools(service as never).aiTools();

    it('is a read tool behind stockLedger.view', () => {
        expect(movements).toMatchObject({ name: 'stock.movements', domain: 'inventory', risk: 'read', permission: 'stockLedger.view' });
        expect(movements!.jsonSchema.properties?.movementType?.enum).toEqual(expect.arrayContaining(['SALE', 'PURCHASE']));
    });

    it('returns compact rows with paging defaults', async () => {
        service.findMovements.mockResolvedValue({
            data: [{
                id: 'm1', createdAt: '2026-09-01T00:00:00.000Z', movementType: 'SALE', itemName: 'Pen', itemCode: 'P1',
                warehouseName: 'Main', quantity: -2, unitCost: 1.5, referenceType: 'INVOICE', referenceId: 'x',
                notes: null, fiscalPeriodId: 'f', fiscalPeriodName: '2026', warehouseId: 'w', itemId: 'i',
            }],
            total: 1, page: 1, limit: 20,
        });
        await expect(run(movements!, { movementType: 'SALE' })).resolves.toEqual({
            items: [{ id: 'm1', date: '2026-09-01T00:00:00.000Z', movementType: 'SALE', itemName: 'Pen', itemCode: 'P1', warehouseName: 'Main', quantity: -2, unitCost: 1.5, referenceType: 'INVOICE' }],
            total: 1,
            page: 1,
        });
        expect(service.findMovements).toHaveBeenCalledWith('tenant-1', { warehouseId: undefined, itemId: undefined, movementType: 'SALE', page: 1, limit: 20 });
    });

    it('rejects an unknown movement type', async () => {
        await expect(movements!.prepare({ movementType: 'THEFT' })).resolves.toMatchObject({ ok: false });
    });
});
