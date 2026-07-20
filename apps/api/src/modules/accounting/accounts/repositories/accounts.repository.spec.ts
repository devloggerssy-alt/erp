import { AccountsRepository } from './accounts.repository';

function makePrismaMock() {
  return {
    chartOfAccount: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    journalLine: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  } as any;
}

describe('AccountsRepository', () => {
  let repository: AccountsRepository;
  let prismaMock: ReturnType<typeof makePrismaMock>;

  beforeEach(() => {
    prismaMock = makePrismaMock();
    repository = new AccountsRepository(prismaMock);
  });

  describe('findAllForBalances', () => {
    it('calls prisma.chartOfAccount.findMany with correct parameters', async () => {
      const mockAccounts = [
        { id: '1', code: '1000', name: { ar: 'الأصول' }, type: 'ASSET', parentId: null, isActive: true },
        { id: '2', code: '1100', name: { ar: 'نقد' }, type: 'ASSET', parentId: '1', isActive: true },
      ];

      prismaMock.chartOfAccount.findMany.mockResolvedValue(mockAccounts);

      const result = await repository.findAllForBalances('tenant-1');

      expect(prismaMock.chartOfAccount.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', deletedAt: null },
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          parentId: true,
          isActive: true,
          isContra: true,
        },
        orderBy: { code: 'asc' },
      });

      expect(result).toEqual(mockAccounts);
    });

    it('returns empty array when no accounts exist', async () => {
      prismaMock.chartOfAccount.findMany.mockResolvedValue([]);

      const result = await repository.findAllForBalances('tenant-empty');

      expect(result).toEqual([]);
      expect(prismaMock.chartOfAccount.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-empty', deletedAt: null },
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          parentId: true,
          isActive: true,
          isContra: true,
        },
        orderBy: { code: 'asc' },
      });
    });
  });
});
