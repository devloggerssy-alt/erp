import { Body, Controller, Post, Get, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody, ApiConsumes } from '@nestjs/swagger';
import multer from 'multer';
import { DatabaseExportService } from '../services/database-export.service';
import { DatabaseImportService } from '../services/database-import.service';
import { JwtAuthGuard, PermissionsGuard } from '../../auth/guards';
import { CurrentUser, RequestUser } from '../../auth/decorators';
import { RequirePermission } from '@devloggers/backend-core';
import { ApiResponseBuilder } from '../../../../common/api/api-response-builder';
import { ApiStandardErrors, ApiOkResponseStandard } from '../../../../common/decorators/api-swagger.decorators';
import { ImportDatabaseDto, DatabaseBackupResultDto } from '../dto/database-backup.dto';

@ApiTags('Settings')
@Controller('settings/danger')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class DatabaseBackupController {
    constructor(
        private readonly databaseExportService: DatabaseExportService,
        private readonly databaseImportService: DatabaseImportService,
    ) {}

    @Get('export-database')
    @RequirePermission('danger.export')
    @ApiOperation({
        summary: 'Export the full tenant database',
        description:
            'Downloads every tenant-scoped record (accounting, invoicing, inventory, catalog, parties, ' +
            'users/roles, settings) as a gzip-compressed JSON backup. File attachments are not included — ' +
            'only their metadata rows.',
    })
    @ApiStandardErrors()
    exportDatabase(@CurrentUser() user: RequestUser): Promise<StreamableFile> {
        return this.databaseExportService.exportTenant(user.tenantId);
    }

    @Post('import-database')
    @RequirePermission('danger.import')
    @ApiOperation({
        summary: 'Restore the tenant database from a backup',
        description:
            'DANGER: wipes ALL existing data for this tenant and replaces it with the uploaded backup. ' +
            'The tenant ID in every restored row is rewritten to the current tenant, so a backup from a ' +
            'different tenant can be used to migrate into this one. Requires the exact confirmation phrase. ' +
            'The acting admin will be logged out afterward, since users/roles are replaced too.',
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({ type: ImportDatabaseDto })
    @ApiOkResponseStandard(DatabaseBackupResultDto, { description: 'Restore completed; returns per-model row counts' })
    @ApiStandardErrors()
    @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
    async importDatabase(
        @CurrentUser() user: RequestUser,
        @UploadedFile() file: Express.Multer.File,
        @Body() _dto: ImportDatabaseDto,
    ) {
        const result = await this.databaseImportService.importTenant(user.tenantId, file.buffer);
        return ApiResponseBuilder.success(result, 'Database restored');
    }
}
