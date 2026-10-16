import { Test } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { AuditLogPresenter } from './presenters/audit-log.presenter';
import { AuditLogRepository } from './repositories/audit-log.repository';

describe('AuditService.findAll', () => {
    const repository = {
        findPage: jest.fn(),
    };

    let service: AuditService;

    beforeEach(async () => {
        jest.clearAllMocks();
        const moduleRef = await Test.createTestingModule({
            providers: [
                AuditService,
                AuditLogPresenter,
                { provide: AuditLogRepository, useValue: repository },
            ],
        }).compile();

        service = moduleRef.get(AuditService);
    });

    it('returns presented audit rows, not raw rows', async () => {
        repository.findPage.mockResolvedValue({
            rows: [
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
            ],
            total: 1,
        });

        const result = await service.findAll('t1', { entityType: 'PAYMENT', page: 1, limit: 50 });

        expect(repository.findPage).toHaveBeenCalledWith('t1', { entityType: 'PAYMENT' }, 1, 50);
        expect(result).toEqual({
            data: [
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
            ],
            total: 1,
            page: 1,
            limit: 50,
        });
    });

    it('defaults to page 1 and limit 50 when none are given', async () => {
        repository.findPage.mockResolvedValue({ rows: [], total: 0 });

        await service.findAll('t1', {});

        expect(repository.findPage).toHaveBeenCalledWith('t1', {}, 1, 50);
    });
});
