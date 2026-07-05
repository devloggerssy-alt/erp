import { AccountsService } from './accounts.service';

const localeStub = { resolve: (v: any) => v?.ar ?? '' } as any;
const emitterStub = { emit: jest.fn() } as any;
const presenterStub = {} as any;

function makeRepo(overrides: Partial<any> = {}) {
  return {
    findAllForBalances: jest.fn(),
    isCodeTaken: jest.fn(),
    ...overrides,
  } as any;
}

describe('AccountsService.getTree', () => {
  it('returns lightweight account data with locale-resolved names', async () => {
    const repo = makeRepo({
      findAllForBalances: jest.fn().mockResolvedValue([
        { id: 'assets', code: '1000', name: { ar: 'الأصول', en: 'Assets' }, type: 'ASSET', parentId: null, isActive: true },
        { id: 'cash', code: '1110', name: { ar: 'نقد', en: 'Cash' }, type: 'ASSET', parentId: 'assets', isActive: true },
        { id: 'rev', code: '4000', name: { ar: 'إيرادات', en: 'Revenue' }, type: 'REVENUE', parentId: null, isActive: false },
      ]),
    });
    const service = new AccountsService(repo, presenterStub, emitterStub, localeStub);

    const result = await service.getTree('t1');

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      id: 'assets',
      code: '1000',
      name: 'الأصول',
      nameI18n: { ar: 'الأصول', en: 'Assets' },
      type: 'ASSET',
      parentId: null,
      isActive: true,
    });
    expect(result[1].parentId).toBe('assets');
    expect(result[2].isActive).toBe(false);
    expect(repo.findAllForBalances).toHaveBeenCalledWith('t1');
  });

  it('handles null parentId correctly', async () => {
    const repo = makeRepo({
      findAllForBalances: jest.fn().mockResolvedValue([
        { id: 'root', code: '1000', name: { ar: 'جذر' }, type: 'ASSET', parentId: null, isActive: true },
      ]),
    });
    const service = new AccountsService(repo, presenterStub, emitterStub, localeStub);

    const result = await service.getTree('t1');

    expect(result[0].parentId).toBeNull();
  });

  it('returns empty array when no accounts exist', async () => {
    const repo = makeRepo({
      findAllForBalances: jest.fn().mockResolvedValue([]),
    });
    const service = new AccountsService(repo, presenterStub, emitterStub, localeStub);

    const result = await service.getTree('t1');

    expect(result).toEqual([]);
  });
});
