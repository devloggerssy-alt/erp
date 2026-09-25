import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CrudRepository } from '@devloggers/backend-core';
import type { DocumentSequence, Prisma } from '@devloggers/db-prisma';

@Injectable()
export class DocumentSequencesRepository extends CrudRepository<DocumentSequence, Prisma.DocumentSequenceDelegate> {
    constructor(private readonly prisma: PrismaService) {
        super(prisma.documentSequence);
    }

    async findByDocumentType(tenantId: string, documentType: string): Promise<DocumentSequence | null> {
        return this.prisma.documentSequence.findUnique({
            where: { tenantId_documentType: { tenantId, documentType } },
        });
    }

    /**
     * Atomically increments and returns the next document number.
     * Returns a formatted string like "SAL-00001".
     */
    async getNextNumber(tenantId: string, documentType: string): Promise<string> {
        const seq = await this.prisma.documentSequence.findUnique({
            where: { tenantId_documentType: { tenantId, documentType } },
        });

        if (!seq) {
            throw new NotFoundException(`No sequence configured for document type: ${documentType}`);
        }

        await this.prisma.documentSequence.update({
            where: { id: seq.id },
            data: { nextNumber: { increment: 1 } },
        });

        const padded = String(seq.nextNumber).padStart(seq.padding, '0');
        return `${seq.prefix}-${padded}`;
    }

    /**
     * Same contract as `getNextNumber`, but the increment runs on the caller's
     * transaction client so a rollback un-consumes the number and concurrent
     * callers serialize on the row lock instead of racing on two statements.
     */
    async getNextNumberInTx(tx: Prisma.TransactionClient, tenantId: string, documentType: string): Promise<string> {
        let seq;
        try {
            seq = await tx.documentSequence.update({
                where: { tenantId_documentType: { tenantId, documentType } },
                data: { nextNumber: { increment: 1 } },
            });
        } catch (error) {
            if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2025') {
                throw new NotFoundException(`No sequence configured for document type: ${documentType}`);
            }
            throw error;
        }

        const padded = String(seq.nextNumber - 1).padStart(seq.padding, '0');
        return `${seq.prefix}-${padded}`;
    }
}
