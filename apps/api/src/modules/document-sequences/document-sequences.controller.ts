import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { DocumentSequencesService } from './document-sequences.service';
import { CreateDocumentSequenceDto, UpdateDocumentSequenceDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, RequestUser } from '../auth/decorators';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';
import { ApiStandardErrors } from '../../common/decorators/api-swagger.decorators';

@ApiTags('Document Sequences')
@Controller('document-sequences')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class DocumentSequencesController {
    constructor(private readonly sequencesService: DocumentSequencesService) {}

    @Get()
    @ApiOperation({ summary: 'List all document sequences' })
    @ApiOkResponse({
        description: 'Document sequences list retrieved',
        schema: {
            example: {
                message: 'Document sequences list',
                data: [
                    { id: '00000000-0000-4000-a500-000000000001', prefix: 'INV', nextNumber: 1, name: 'Sales Invoice Sequence' },
                    { id: '00000000-0000-4000-a500-000000000002', prefix: 'PUR', nextNumber: 1, name: 'Purchase Invoice Sequence' },
                ],
            },
        },
    })
    @ApiStandardErrors()
    async findAll(@CurrentUser() user: RequestUser) {
        const sequences = await this.sequencesService.findAll(user.tenantId);
        return ApiResponseBuilder.success(sequences, 'Document sequences list');
    }

    @Post()
    @ApiOperation({ summary: 'Create a new document sequence' })
    @ApiCreatedResponse({
        description: 'Document sequence created',
        schema: {
            example: {
                message: 'Document sequence created',
                data: { id: '00000000-0000-4000-a500-000000000003', prefix: 'PAY', nextNumber: 1, name: 'Payment Sequence' },
            },
        },
    })
    @ApiStandardErrors()
    async create(
        @CurrentUser() user: RequestUser,
        @Body() dto: CreateDocumentSequenceDto,
    ) {
        const sequence = await this.sequencesService.create(user.tenantId, dto);
        return ApiResponseBuilder.success(sequence, 'Document sequence created');
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a document sequence' })
    @ApiOkResponse({
        description: 'Document sequence updated',
        schema: {
            example: {
                message: 'Document sequence updated',
                data: { id: '00000000-0000-4000-a500-000000000001', prefix: 'SI', nextNumber: 100 },
            },
        },
    })
    @ApiStandardErrors()
    async update(
        @CurrentUser() user: RequestUser,
        @Param('id') id: string,
        @Body() dto: UpdateDocumentSequenceDto,
    ) {
        const sequence = await this.sequencesService.update(user.tenantId, id, dto);
        return ApiResponseBuilder.success(sequence, 'Document sequence updated');
    }
}
