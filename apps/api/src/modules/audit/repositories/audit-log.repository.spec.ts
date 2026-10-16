import { Test } from '@nestjs/testing';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { AuditLogRepository } from './audit-log.repository';

describe('AuditLogRepository.findPage', () => {
    const prisma = {
        auditLog: {
            findMany: jest.fn().mockResolvedValue([]),
            count: jest.fn().mockResolvedValue(0),
        },
    };

    let repository: AuditLogRepository;

    beforeEach(async () => {
        jest.clearAllMocks();
        const moduleRef = await Test.createTestingModule({
            providers: [AuditLogRepository, { provide: PrismaService, useValue: prisma }],
        }).compile();

        repository = moduleRef.get(AuditLogRepository);
    });

    it('scopes to the tenant and applies only the filters that were given', async () => {
        await repository.findPage('t1', { entityType: 'INVOICE' }, 1, 50);

        expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
            where: { tenantId: 't1', entityType: 'INVOICE' },
            orderBy: { createdAt: 'desc' },
            skip: 0,
            take: 50,
        });
        expect(prisma.auditLog.count).toHaveBeenCalledWith({
            where: { tenantId: 't1', entityType: 'INVOICE' },
        });
    });

    it('filters by entity ID as well when both filters are given', async () => {
        await repository.findPage('t1', { entityType: 'INVOICE', entityId: 'e1' }, 2, 10);

        expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { tenantId: 't1', entityType: 'INVOICE', entityId: 'e1' },
                skip: 10,
                take: 10,
            }),
        );
    });

    it('returns the page rows together with the total count', async () => {
        const rows = [{ id: 'a1' }];
        prisma.auditLog.findMany.mockResolvedValueOnce(rows);
        prisma.auditLog.count.mockResolvedValueOnce(7);

        await expect(repository.findPage('t1', {}, 1, 50)).resolves.toEqual({ rows, total: 7 });
    });
});
