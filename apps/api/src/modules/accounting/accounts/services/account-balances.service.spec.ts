import { AccountBalancesService } from './account-balances.service';

const localeStub = { resolve: (v: any) => v?.ar ?? '' } as any;

function makeRepo(overrides: Partial<any> = {}) {
  return {
    findAllForBalances: jest.fn(),
    sumPostedLinesByAccount: jest.fn(),
    findLedgerLines: jest.fn(),
    countLedgerLines: jest.fn(),
    ...overrides,
  } as any;
}

describe('AccountBalancesService.getBalances', () => {
  it('computes signed own balances and rolls them up', async () => {
    const repo = makeRepo({
      findAllForBalances: jest.fn().mockResolvedValue([
        { id: 'assets', code: '1000', name: { ar: 'الأصول' }, type: 'ASSET', parentId: null, isActive: true },
        { id: 'cash', code: '1110', name: { ar: 'نقد' }, type: 'ASSET', parentId: 'assets', isActive: true },
        { id: 'rev', code: '4000', name: { ar: 'إيرادات' }, type: 'REVENUE', parentId: null, isActive: true },
      ]),
      sumPostedLinesByAccount: jest.fn().mockResolvedValue([
        { accountId: 'cash', debit: 300, credit: 100 }, // ASSET → +200
        { accountId: 'rev', debit: 0, credit: 500 },     // REVENUE → +500
      ]),
    });
    const service = new AccountBalancesService(repo, localeStub);

    const result = await service.getBalances('t1');
    const byId = Object.fromEntries(result.map((r) => [r.id, r]));

    expect(byId['cash'].ownBalance).toBe(200);
    expect(byId['cash'].rolledBalance).toBe(200);
    expect(byId['assets'].ownBalance).toBe(0);
    expect(byId['assets'].rolledBalance).toBe(200); // rolled from cash
    expect(byId['rev'].ownBalance).toBe(500);
    expect(byId['assets'].name).toBe('الأصول'); // locale-resolved
  });

  it('rolls up balances through multiple hierarchy levels', async () => {
    const repo = makeRepo({
      findAllForBalances: jest.fn().mockResolvedValue([
        { id: 'assets', code: '1000', name: { ar: 'الأصول' }, type: 'ASSET', parentId: null, isActive: true },
        { id: 'current', code: '1100', name: { ar: 'أصول متداولة' }, type: 'ASSET', parentId: 'assets', isActive: true },
        { id: 'cash', code: '1110', name: { ar: 'نقد' }, type: 'ASSET', parentId: 'current', isActive: true },
        { id: 'bank', code: '1120', name: { ar: 'بنك' }, type: 'ASSET', parentId: 'current', isActive: true },
      ]),
      sumPostedLinesByAccount: jest.fn().mockResolvedValue([
        { accountId: 'cash', debit: 500, credit: 100 }, // ASSET → +400
        { accountId: 'bank', debit: 1000, credit: 200 }, // ASSET → +800
      ]),
    });
    const service = new AccountBalancesService(repo, localeStub);

    const result = await service.getBalances('t1');
    const byId = Object.fromEntries(result.map((r) => [r.id, r]));

    // Leaf accounts: own = rolled
    expect(byId['cash'].ownBalance).toBe(400);
    expect(byId['cash'].rolledBalance).toBe(400);
    expect(byId['bank'].ownBalance).toBe(800);
    expect(byId['bank'].rolledBalance).toBe(800);

    // Parent: own = 0, rolled = sum of children
    expect(byId['current'].ownBalance).toBe(0);
    expect(byId['current'].rolledBalance).toBe(1200); // 400 + 800

    // Grandparent: own = 0, rolled = sum of all descendants
    expect(byId['assets'].ownBalance).toBe(0);
    expect(byId['assets'].rolledBalance).toBe(1200); // rolled from current
  });
});

describe('AccountBalancesService.getLedger', () => {
  it('maps lines and returns pagination meta', async () => {
    const repo = makeRepo({
      countLedgerLines: jest.fn().mockResolvedValue(1),
      findLedgerLines: jest.fn().mockResolvedValue([
        {
          id: 'l1', debit: 150, credit: 0, description: 'Inv',
          journalEntry: { number: 'JE-1', date: new Date('2026-01-15T00:00:00.000Z'), referenceType: 'invoice', referenceId: 'inv1' },
        },
      ]),
    });
    const service = new AccountBalancesService(repo, localeStub);

    const result = await service.getLedger('t1', 'cash', 1, 50);

    expect(result.total).toBe(1);
    expect(result.data[0]).toEqual({
      id: 'l1',
      date: '2026-01-15T00:00:00.000Z',
      entryNumber: 'JE-1',
      description: 'Inv',
      referenceType: 'invoice',
      referenceId: 'inv1',
      debit: 150,
      credit: 0,
    });
    expect(repo.findLedgerLines).toHaveBeenCalledWith('t1', 'cash', 0, 50);
  });
});
