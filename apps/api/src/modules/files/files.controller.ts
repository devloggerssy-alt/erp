import {
    Body,
    Controller,
    Delete,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
    ApiBearerAuth,
    ApiBody,
    ApiConsumes,
    ApiNoContentResponse,
    ApiOkResponse,
    ApiOperation,
    ApiProperty,
    ApiPropertyOptional,
    ApiTags,
} from '@nestjs/swagger';
import multer from 'multer';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '@/modules/identity/auth/guards';
import { CurrentUser, RequestUser } from '@/modules/identity/auth/decorators';

class UploadFileDto {
    @ApiProperty({ type: 'string', format: 'binary', description: 'File to upload' })
    file: any;

    @ApiPropertyOptional({ description: 'Destination folder (default: general)', type: String })
    folder?: string;
}

@ApiTags('Files')
@Controller('files')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class FilesController {
    constructor(private readonly filesService: FilesService) {}

    @Post('upload')
    @ApiOperation({ summary: 'Upload a file', description: 'Upload a file to local or S3 storage and persist its metadata.' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({ type: UploadFileDto })
    @ApiOkResponse({ description: 'File metadata record' })
    @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
    uploadFile(
        @CurrentUser() user: RequestUser,
        @UploadedFile() file: Express.Multer.File,
        @Body('folder') folder?: string,
    ) {
        return this.filesService.upload(file, folder ?? 'general', user.tenantId);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a file by ID' })
    @ApiNoContentResponse({ description: 'File deleted successfully' })
    deleteFile(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        return this.filesService.delete(id, user.tenantId);
    }
}
