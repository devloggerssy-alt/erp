import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { ProfileResponseDto, UpdateProfileDto } from './dto/profile.dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, RequestUser } from '../auth/decorators';
import { ApiOkResponseStandard, ApiStandardErrors } from '../../../common/decorators/api-swagger.decorators';
import { ApiResponseBuilder } from '../../../common/api/api-response-builder';

/**
 * Self-service profile routes. JWT-only on purpose: every signed-in user may
 * update their own profile, so this controller must not carry the fail-closed
 * PermissionsGuard (which would reject routes without @RequirePermission).
 *
 * Registered before UsersController so `PATCH /users/me` is not captured by
 * `PATCH /users/:id`.
 */
@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ProfileController {
    constructor(private readonly profileService: ProfileService) {}

    @Patch('me')
    @ApiOperation({
        summary: 'Update current user profile',
        description: 'Updates the authenticated user\'s own display name, phone and avatar URL. Email and password are not editable here.',
    })
    @ApiOkResponseStandard(ProfileResponseDto, { description: 'Profile updated' })
    @ApiStandardErrors()
    async updateMe(@CurrentUser() user: RequestUser, @Body() dto: UpdateProfileDto) {
        const updated = await this.profileService.updateMe(user.tenantId, user.id, dto);
        return ApiResponseBuilder.success(updated, 'Profile updated');
    }
}
