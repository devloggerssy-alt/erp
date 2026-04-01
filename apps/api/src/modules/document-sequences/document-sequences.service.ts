import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CreateDocumentSequenceDto, UpdateDocumentSequenceDto } from './dto';

@Injectable()
export class DocumentSequencesService {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(tenantId: string) {
        return this.prisma.documentSequence.findMany({
            where: { tenantId },
            orderBy: { documentType: 'asc' },
        });
    }

    async create(tenantId: string, dto: CreateDocumentSequenceDto) {
        const existing = await this.prisma.documentSequence.findUnique({
            where: {
                tenantId_documentType: {
                    tenantId,
                    documentType: dto.documentType,
                },
            },
        });
        if (existing) {
            throw new ConflictException('Sequence for this document type already exists');
        }

        return this.prisma.documentSequence.create({
            data: {
                tenantId,
                documentType: dto.documentType,
                prefix: dto.prefix,
                nextNumber: dto.nextNumber ?? 1,
                padding: dto.padding ?? 5,
            },
        });
    }

    async update(tenantId: string, id: string, dto: UpdateDocumentSequenceDto) {
        const seq = await this.prisma.documentSequence.findFirst({
            where: { id, tenantId },
        });
        if (!seq) {
            throw new NotFoundException('Document sequence not found');
        }

        return this.prisma.documentSequence.update({
            where: { id },
            data: dto,
        });
    }

    /**
     * Atomically get and increment the next number for a document type.
     * Returns the formatted document number (e.g. "SAL-00001").
     */
    async getNextNumber(tenantId: string, documentType: string): Promise<string> {
        const seq = await this.prisma.documentSequence.findUnique({
            where: {
                tenantId_documentType: { tenantId, documentType },
            },
        });

        if (!seq) {
            throw new NotFoundException(
                `No sequence configured for document type: ${documentType}`,
            );
        }

        // Atomic increment
        const updated = await this.prisma.documentSequence.update({
            where: { id: seq.id },
            data: { nextNumber: { increment: 1 } },
        });

        const padded = String(seq.nextNumber).padStart(seq.padding, '0');
        return `${seq.prefix}-${padded}`;
    }
}
