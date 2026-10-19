import { BadRequestException } from '@nestjs/common';
import { WarehousesService } from './services/warehouses.service';

function build() {
        const repository = {
                isCodeTaken: jest.fn().mockResolvedValue(false),
                create: jest.fn(),
                update: jest.fn(),
                delete: jest.fn().mockResolvedValue({}),
                findByIdWithBranches: jest.fn(),
                findByIdOrFail: jest.fn(),
        };
        const presenter = {
                toResponse: jest.fn((entity: unknown) => entity),
                toResponseList: jest.fn((entities: unknown[]) => entities),
        };
        const codeSequences = { next: jest.fn().mockResolvedValue('WH-0001') };
        const branchesService = {
                assertBranchesBelongToTenant: jest.fn().mockResolvedValue(undefined),
                replaceWarehouseBranches: jest.fn().mockResolvedValue(undefined),
        };
        const emitter = { emit: jest.fn() };

        const service = new WarehousesService(
                repository as never,
                presenter as never,
                codeSequences as never,
                branchesService as never,
                emitter as never,
        );
        return { service, repository, branchesService };
}

describe('WarehousesService — branch membership', () => {
        it('validates tenant ownership of the branches and links them on create', async () => {
                const { service, repository, branchesService } = build();
                repository.create.mockResolvedValue({ id: 'w1', tenantId: 't1', code: 'WH-0001' });
                repository.findByIdWithBranches.mockResolvedValue({ id: 'w1', tenantId: 't1', code: 'WH-0001' });

                await service.create('t1', {
                        name: { ar: 'المستودع' },
                        branchIds: ['b1'],
                } as never);

                expect(branchesService.assertBranchesBelongToTenant).toHaveBeenCalledWith('t1', ['b1']);
                // branchIds never reach the Prisma create payload.
                expect(repository.create).toHaveBeenCalledWith(
                        expect.objectContaining({ tenantId: 't1', code: 'WH-0001' }),
                );
                expect(repository.create.mock.calls[0]?.[0]).not.toHaveProperty('branchIds');
                expect(branchesService.replaceWarehouseBranches).toHaveBeenCalledWith('t1', 'w1', ['b1']);
        });

        it('refuses to create a warehouse with a branch that is not in this tenant', async () => {
                const { service, repository, branchesService } = build();
                branchesService.assertBranchesBelongToTenant.mockRejectedValue(
                        new BadRequestException('One or more branches do not belong to this tenant'),
                );

                await expect(
                        service.create('t1', { name: { ar: 'المستودع' }, branchIds: ['foreign'] } as never),
                ).rejects.toThrow(BadRequestException);
                expect(repository.create).not.toHaveBeenCalled();
        });

        it('replaces branch links on update', async () => {
                const { service, repository, branchesService } = build();
                repository.findByIdOrFail.mockResolvedValue({ id: 'w1', tenantId: 't1' });
                repository.findByIdWithBranches.mockResolvedValue({ id: 'w1', tenantId: 't1' });

                await service.update('t1', 'w1', { branchIds: ['b2'] } as never);

                expect(branchesService.replaceWarehouseBranches).toHaveBeenCalledWith('t1', 'w1', ['b2']);
        });
});
