import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentSequencesService } from './document-sequences.service';
import { CreateDocumentSequenceDto, UpdateDocumentSequenceDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, RequestUser } from '../auth/decorators';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';

@ApiTags('Document Sequences')
@Controller('document-sequences')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class DocumentSequencesController {
    constructor(private readonly sequencesService: DocumentSequencesService) {}

    @Get()
    async findAll(@CurrentUser() user: RequestUser) {
        const sequences = await this.sequencesService.findAll(user.tenantId);
        return ApiResponseBuilder.success(sequences, 'Document sequences list');
    }

    @Post()
    async create(
        @CurrentUser() user: RequestUser,
        @Body() dto: CreateDocumentSequenceDto,
    ) {
        const sequence = await this.sequencesService.create(user.tenantId, dto);
        return ApiResponseBuilder.success(sequence, 'Document sequence created');
    }

    @Patch(':id')
    async update(
        @CurrentUser() user: RequestUser,
        @Param('id') id: string,
        @Body() dto: UpdateDocumentSequenceDto,
    ) {
        const sequence = await this.sequencesService.update(user.tenantId, id, dto);
        return ApiResponseBuilder.success(sequence, 'Document sequence updated');
    }
}
