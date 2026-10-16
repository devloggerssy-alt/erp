import { Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
    ApiBearerAuth,
    ApiBody,
    ApiConsumes,
    ApiOperation,
    ApiProperty,
    ApiTags,
} from '@nestjs/swagger';
import multer from 'multer';
import { FilesService } from './files.service';
import { FileResponseDto } from './dto/file-response.dto';
import { JwtAuthGuard } from '@/modules/identity/auth/guards';
import { CurrentUser, RequestUser } from '@/modules/identity/auth/decorators';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';
import { ApiCreatedResponseStandard } from '../../common/decorators/api-swagger.decorators';
import { FILE_SIZE_LIMITS } from './storage/s3.utils';

class UploadAvatarDto {
    @ApiProperty({ type: 'string', format: 'binary', description: 'Avatar image' })
    file: any;
}

/**
 * Self-service avatar upload. JWT-only on purpose: every signed-in user may set
 * their own avatar, so this controller must not carry the fail-closed
 * PermissionsGuard used by FilesController for files.manage routes.
 */
@ApiTags('Files')
@Controller('files')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AvatarController {
    constructor(private readonly filesService: FilesService) {}

    @Post('avatar')
    @ApiOperation({
        summary: 'Upload current user avatar',
        description: 'Stores an image under the tenant avatar folder and returns its file metadata. Image types only, max 10 MB.',
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({ type: UploadAvatarDto })
    @ApiCreatedResponseStandard(FileResponseDto, { description: 'Avatar file metadata record' })
    @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage(), limits: { fileSize: FILE_SIZE_LIMITS.IMAGE } }))
    async uploadAvatar(@CurrentUser() user: RequestUser, @UploadedFile() file: Express.Multer.File) {
        const uploaded = await this.filesService.uploadAvatar(file, user.tenantId, user.id);
        return ApiResponseBuilder.success(uploaded, 'Avatar uploaded');
    }
}
