import {
    Controller,
    Get,
    Post,
    Query,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
    ApiBearerAuth,
    ApiBody,
    ApiConsumes,
    ApiOkResponse,
    ApiOperation,
    ApiProperty,
    ApiPropertyOptional,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger';
import multer from 'multer';
import { itemCategoryResource } from '@devloggers/api-contracts';
import { ApiFilterQuery } from '@devloggers/backend-core';
import { ApiQueryOptionsDto } from '@/common/api/api-query-options.dto';
import { ApiResponseBuilder } from '@/common/api/api-response-builder';
import { JwtAuthGuard } from '@/modules/identity/auth/guards';
import { CurrentUser, RequestUser } from '@/modules/identity/auth/decorators';
import { ItemsExportService } from '../services/items-export.service';
import { ItemsImportService } from '../services/items-import.service';
import { ImportResultResponseDto } from '../dto/import-result.dto';

class ImportFileDto {
    @ApiProperty({ type: 'string', format: 'binary', description: 'Excel file (.xlsx)' })
    file: unknown;
}

const ITEMS_FILTER_SCHEMA = [
    { field: 'categoryId', type: 'id' as const, foreignResourceKey: itemCategoryResource.key },
    { field: 'name', type: 'string' as const },
    { field: 'code', type: 'string' as const },
    { field: 'defaultSellingPrice', type: 'number' as const },
    { field: 'isActive', type: 'boolean' as const },
    { field: 'createdAt', type: 'date' as const },
];

@ApiTags('Catalog / Items')
@Controller('items')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ItemsImportExportController {
    constructor(
        private readonly itemsExportService: ItemsExportService,
        private readonly itemsImportService: ItemsImportService,
    ) {}

    @Get('export')
    @ApiOperation({
        summary: 'Export items to Excel',
        description: 'Exports items matching the current list filters (max 10,000 rows). Includes custom field columns.',
    })
    @ApiFilterQuery(ITEMS_FILTER_SCHEMA)
    @ApiQuery({ name: 'search', required: false, type: String })
    exportItems(
        @CurrentUser() user: RequestUser,
        @Query() query: ApiQueryOptionsDto,
    ) {
        return this.itemsExportService.exportToExcel(user.tenantId, query, ITEMS_FILTER_SCHEMA);
    }

    @Get('import/template')
    @ApiOperation({
        summary: 'Download items import template',
        description: 'Returns an Excel template with column headers, sample row, and instructions.',
    })
    downloadTemplate(@CurrentUser() user: RequestUser) {
        return this.itemsExportService.buildTemplate(user.tenantId);
    }

    @Post('import')
    @ApiOperation({
        summary: 'Import items from Excel',
        description: 'Upserts items by code. Use dryRun=true to validate without saving.',
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({ type: ImportFileDto })
    @ApiQuery({
        name: 'dryRun',
        required: false,
        type: Boolean,
        description: 'When true, validates rows without creating or updating records.',
    })
    @ApiOkResponse({ type: ImportResultResponseDto })
    @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
    async importItems(
        @CurrentUser() user: RequestUser,
        @UploadedFile() file: Express.Multer.File,
        @Query('dryRun') dryRun?: string,
    ) {
        const isDryRun = dryRun === 'true' || dryRun === '1';
        const result = await this.itemsImportService.importFromExcel(
            user.tenantId,
            file,
            isDryRun,
        );
        const message = isDryRun
            ? 'Import validation completed'
            : 'Import completed';
        return ApiResponseBuilder.success(result, message);
    }
}
