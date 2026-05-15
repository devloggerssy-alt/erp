import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CrudRepository } from '@devloggers/backend-core';
import type { DocumentSequence } from '@devloggers/db-prisma';

@Injectable()
export class DocumentSequencesRepository extends CrudRepository<DocumentSequence> {
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
}
