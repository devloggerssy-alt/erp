import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentSequencesService } from '../services/document-sequences.service';
import { CreateDocumentSequenceDto, UpdateDocumentSequenceDto, DocumentSequenceResponseDto } from '../dto';
import { createCrudController, type CrudOpenApi } from '@devloggers/backend-core';
import { JwtAuthGuard } from '@/modules/identity/auth/guards';

const DOCUMENT_SEQUENCES_OPENAPI = {
    list: {
        operation: { summary: 'List document sequences' },
        responseDescription: 'Paginated list of document sequences',
    },
    show: {
        operation: { summary: 'Get a document sequence by ID' },
        responseDescription: 'Document sequence details',
        idParam: { description: 'Document sequence UUID' },
    },
    create: {
        operation: { summary: 'Create a document sequence', description: 'Each document type can have only one sequence per tenant.' },
        responseDescription: 'Document sequence created successfully',
    },
    update: {
        operation: { summary: 'Update a document sequence', description: 'Update prefix, padding, or manually advance the sequence number.' },
        responseDescription: 'Updated document sequence',
        idParam: { description: 'Document sequence UUID' },
    },
    delete: {
        operation: { summary: 'Delete a document sequence' },
        noContentDescription: 'Document sequence deleted successfully',
        idParam: { description: 'Document sequence UUID' },
    },
} satisfies CrudOpenApi;

const DocumentSequencesCrudBase = createCrudController({
    responseDto: DocumentSequenceResponseDto,
    createDto: CreateDocumentSequenceDto,
    updateDto: UpdateDocumentSequenceDto,
    openApi: DOCUMENT_SEQUENCES_OPENAPI,
});

@ApiTags('Accounting / Document Sequences')
@Controller('document-sequences')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class DocumentSequencesController extends DocumentSequencesCrudBase {
    constructor(private readonly documentSequencesService: DocumentSequencesService) {
        super(documentSequencesService, 'Document Sequence');
    }
}
