import { Test } from '@nestjs/testing';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { AuditService } from './audit.service';
import { AuditLogPresenter } from './presenters/audit-log.presenter';

describe('AuditService.findAll', () => {
    const prisma = {
        auditLog: {
            findMany: jest.fn(),
            count: jest.fn(),
        },
    };

    let service: AuditService;

    beforeEach(async () => {
        jest.clearAllMocks();
        const moduleRef = await Test.createTestingModule({
            providers: [
                AuditService,
                AuditLogPresenter,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = moduleRef.get(AuditService);
    });

    it('returns presented audit rows, not raw Prisma rows', async () => {
        prisma.auditLog.findMany.mockResolvedValue([
            {
                id: 'a1',
                tenantId: 't1',
                userId: 'u1',
                action: 'CREATE',
                entityType: 'PAYMENT',
                entityId: 'e1',
                oldValues: null,
                newValues: { amount: 10 },
                ipAddress: '203.0.113.7',
                source: 'HTTP',
                correlationId: null,
                metadata: null,
                createdAt: new Date('2026-04-14T12:00:00.000Z'),
                internalFlag: true,
            },
        ]);
        prisma.auditLog.count.mockResolvedValue(1);

        const result = await service.findAll('t1', { page: 1, limit: 50 });

        expect(result.data).toEqual([
            {
                id: 'a1',
                tenantId: 't1',
                userId: 'u1',
                action: 'CREATE',
                entityType: 'PAYMENT',
                entityId: 'e1',
                oldValues: null,
                newValues: { amount: 10 },
                ipAddress: '203.0.113.7',
                source: 'HTTP',
                correlationId: null,
                metadata: null,
                createdAt: '2026-04-14T12:00:00.000Z',
            },
        ]);
        expect(result.total).toBe(1);
    });
});
