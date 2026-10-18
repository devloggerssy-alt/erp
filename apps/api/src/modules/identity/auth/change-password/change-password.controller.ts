import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChangePasswordDto } from './change-password.dto';
import { ChangePasswordService } from './change-password.service';
import { JwtAuthGuard } from '../guards';
import { CurrentUser, RequestUser } from '../decorators';
import { ApiStandardErrors } from '../../../../common/decorators/api-swagger.decorators';
import { ApiResponseBuilder } from '../../../../common/api/api-response-builder';
import { ApiMessageResponseDto } from '../../../../common/api/message-response.dto';

/**
 * Self-service password change. JWT-only on purpose: every signed-in user may
 * change their own password, so this controller must not carry the fail-closed
 * PermissionsGuard.
 */
@ApiTags('Auth')
@Controller('auth')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ChangePasswordController {
    constructor(private readonly changePasswordService: ChangePasswordService) {}

    @Post('change-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Change current user password',
        description: 'Verifies the current password and stores a new hash. Existing sessions stay valid until token expiry.',
    })
    @ApiOkResponse({ type: ApiMessageResponseDto, description: 'Password updated' })
    @ApiStandardErrors()
    async changePassword(@CurrentUser() user: RequestUser, @Body() dto: ChangePasswordDto) {
        await this.changePasswordService.changePassword(user.id, dto.currentPassword, dto.newPassword);
        return ApiResponseBuilder.success(null, 'Password updated');
    }
}
