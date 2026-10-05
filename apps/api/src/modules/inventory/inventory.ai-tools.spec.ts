import type { AiTool, AiToolContext } from '@devloggers/backend-core';
import { InventoryAiTools } from './inventory.ai-tools';

const ctx: AiToolContext = { tenantId: 'tenant-1', userId: 'user-1', permissions: new Set<string>(), locale: 'en', conversationId: 'conv-1' };
const ID = '11111111-1111-4111-8111-111111111111';

async function run(tool: AiTool, input: unknown): Promise<unknown> {
    const prepared = await tool.prepare(input);
    if (!prepared.ok) throw new Error(`invalid input: ${JSON.stringify(prepared.errors)}`);
    return prepared.run(ctx);
}

describe('InventoryAiTools', () => {
    const service = { getBalances: jest.fn() };
    const [balances] = new InventoryAiTools(service as never).aiTools();

    it('is a read tool in the inventory domain behind inventory.view', () => {
        expect(balances).toMatchObject({ name: 'stock.balances', domain: 'inventory', risk: 'read', permission: 'inventory.view' });
    });

    it('caps rows at 50 and reports the full total', async () => {
        service.getBalances.mockResolvedValue(Array.from({ length: 60 }, (_, i) => ({ itemId: String(i) })));
        const result = (await run(balances!, { warehouseId: ID })) as { items: unknown[]; total: number };
        expect(result.items).toHaveLength(50);
        expect(result.total).toBe(60);
        expect(service.getBalances).toHaveBeenCalledWith('tenant-1', { warehouseId: ID, itemId: undefined });
    });

    it('rejects a non-UUID warehouseId', async () => {
        await expect(balances!.prepare({ warehouseId: 'main' })).resolves.toMatchObject({ ok: false });
    });
});
