import { Injectable, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrudService } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { DocumentSequence } from '@devloggers/db-prisma';
import { DocumentSequencesRepository } from '../repositories/document-sequences.repository';
import { DocumentSequencePresenter } from '../presenters/document-sequence.presenter';
import { CreateDocumentSequenceDto, UpdateDocumentSequenceDto, DocumentSequenceResponseDto } from '../dto';

@Injectable()
export class DocumentSequencesService extends CrudService<DocumentSequence, DocumentSequenceResponseDto, CreateDocumentSequenceDto, UpdateDocumentSequenceDto> {
    protected readonly resourceName = resources.documentSequences.key;

    constructor(
        private readonly documentSequencesRepository: DocumentSequencesRepository,
        private readonly documentSequencePresenter: DocumentSequencePresenter,
        private readonly emitter: EventEmitter2,
    ) {
        super(documentSequencesRepository, documentSequencePresenter, emitter);
    }

    protected override async beforeCreate(tenantId: string, dto: CreateDocumentSequenceDto): Promise<void> {
        const existing = await this.documentSequencesRepository.findByDocumentType(tenantId, dto.documentType);
        if (existing) {
            throw new ConflictException('Sequence for this document type already exists');
        }
    }

    /**
     * Atomically get and increment the next number for a document type.
     * Returns the formatted document number (e.g. "SAL-00001").
     * Called by invoices, payments, stock-counts services.
     */
    async getNextNumber(tenantId: string, documentType: string): Promise<string> {
        return this.documentSequencesRepository.getNextNumber(tenantId, documentType);
    }
}
