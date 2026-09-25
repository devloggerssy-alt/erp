import { NotFoundException } from '@nestjs/common';
import { DocumentSequencesRepository } from './document-sequences.repository';

function buildRepo() {
    const prisma = { documentSequence: { findUnique: jest.fn(), update: jest.fn() } } as any;
    const repo = new DocumentSequencesRepository(prisma);
    return { repo, prisma };
}

describe('DocumentSequencesRepository.getNextNumberInTx', () => {
    it('atomically increments on the given tx and returns the pre-increment number', async () => {
        const { repo } = buildRepo();
        const tx = {
            documentSequence: {
                update: jest.fn().mockResolvedValue({ nextNumber: 6, prefix: 'SAL', padding: 5 }),
            },
        } as any;

        const number = await repo.getNextNumberInTx(tx, 'tenant-1', 'SALES_INVOICE');

        expect(tx.documentSequence.update).toHaveBeenCalledWith({
            where: { tenantId_documentType: { tenantId: 'tenant-1', documentType: 'SALES_INVOICE' } },
            data: { nextNumber: { increment: 1 } },
        });
        expect(number).toBe('SAL-00005');
    });

    it('throws NotFoundException when no sequence is configured', async () => {
        const { repo } = buildRepo();
        const tx = {
            documentSequence: {
                update: jest.fn().mockRejectedValue(Object.assign(new Error('not found'), { code: 'P2025' })),
            },
        } as any;

        await expect(repo.getNextNumberInTx(tx, 'tenant-1', 'RECEIPT')).rejects.toThrow(NotFoundException);
    });
});
