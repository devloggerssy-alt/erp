import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UpdateUserStatusDto, UserResponseDto } from './dto';
import { JwtAuthGuard, PermissionsGuard } from '../auth/guards';
import { CurrentUser, RequestUser } from '../auth/decorators';
import { RequirePermission } from '@devloggers/backend-core';
import { ApiResponseBuilder } from '../../../common/api/api-response-builder';
import {
    ApiStandardErrors,
    ApiOkResponseStandard,
    ApiOkResponsePaginated,
    ApiCreatedResponseStandard,
} from '../../../common/decorators/api-swagger.decorators';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get()
    @RequirePermission('users.view')
    @ApiOperation({ summary: 'List all users' })
    @ApiOkResponsePaginated(UserResponseDto, { description: 'Paginated list of users' })
    @ApiStandardErrors()
    async findAll(
        @CurrentUser() user: RequestUser,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        const result = await this.usersService.findAll(user.tenantId, page, limit);
        return ApiResponseBuilder.success(result.data, 'Users list', {
            pagination: {
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: Math.ceil(result.total / result.limit),
            },
        });
    }

    @Post()
    @RequirePermission('users.create')
    @ApiOperation({ summary: 'Create a new user' })
    @ApiCreatedResponseStandard(UserResponseDto, { description: 'User created successfully' })
    @ApiStandardErrors()
    async create(@CurrentUser() user: RequestUser, @Body() dto: CreateUserDto) {
        const created = await this.usersService.create(user.tenantId, dto);
        return ApiResponseBuilder.success(created, 'User created');
    }

    @Patch(':id')
    @RequirePermission('users.update')
    @ApiOperation({ summary: 'Update a user' })
    @ApiOkResponseStandard(UserResponseDto, { description: 'User updated successfully' })
    @ApiStandardErrors()
    async update(
        @CurrentUser() user: RequestUser,
        @Param('id') id: string,
        @Body() dto: UpdateUserDto,
    ) {
        const updated = await this.usersService.update(user.tenantId, id, dto);
        return ApiResponseBuilder.success(updated, 'User updated');
    }

    @Patch(':id/status')
    @RequirePermission('users.update')
    @ApiOperation({ summary: 'Toggle user active status', description: 'Activates or deactivates a user account. Deactivated users cannot log in.' })
    @ApiOkResponseStandard(UserResponseDto, { description: 'User status updated' })
    @ApiStandardErrors()
    async updateStatus(
        @CurrentUser() user: RequestUser,
        @Param('id') id: string,
        @Body() dto: UpdateUserStatusDto,
    ) {
        const updated = await this.usersService.updateStatus(user.tenantId, id, dto.isActive);
        return ApiResponseBuilder.success(updated, 'User status updated');
    }

    @Get(':id')
    @RequirePermission('users.view')
    @ApiOperation({ summary: 'Get a user by ID' })
    @ApiOkResponseStandard(UserResponseDto, { description: 'User details' })
    @ApiStandardErrors()
    async findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        const result = await this.usersService.findById(user.tenantId, id);
        return ApiResponseBuilder.success(result, 'User details');
    }

    @Delete(':id')
    @RequirePermission('users.delete')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a user', description: 'Hard-deletes the user and all role assignments.' })
    @ApiStandardErrors()
    async remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        await this.usersService.delete(user.tenantId, id);
    }
}
