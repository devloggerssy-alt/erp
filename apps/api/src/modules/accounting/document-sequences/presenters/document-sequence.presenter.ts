import { Injectable } from '@nestjs/common';
import { CrudPresenter } from '@devloggers/backend-core';
import type { DocumentSequence } from '@devloggers/db-prisma';
import { DocumentSequenceResponseDto } from '../dto';

@Injectable()
export class DocumentSequencePresenter extends CrudPresenter<DocumentSequence, DocumentSequenceResponseDto> {
    toResponse(entity: DocumentSequence): DocumentSequenceResponseDto {
        return {
            id: entity.id,
            documentType: entity.documentType,
            prefix: entity.prefix,
            nextNumber: entity.nextNumber,
            padding: entity.padding,
            createdAt: entity.createdAt.toISOString(),
            updatedAt: entity.updatedAt.toISOString(),
        };
    }
}
