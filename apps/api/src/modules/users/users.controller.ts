import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UpdateUserStatusDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, RequestUser } from '../auth/decorators';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';
import { ApiStandardErrors } from '../../common/decorators/api-swagger.decorators';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get()
    @ApiOperation({ summary: 'List all users' })
    @ApiOkResponse({
        description: 'Paginated list of users',
        schema: {
            example: {
                message: 'Users list',
                data: [
                    { id: '00000000-0000-4000-a100-000000000001', email: 'admin@demo-shop.com', name: 'Admin User', isActive: true },
                ],
                meta: { pagination: { total: 5, page: 1, limit: 10, totalPages: 1 } },
            },
        },
    })
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
    @ApiOperation({ summary: 'Create a new user' })
    @ApiCreatedResponse({
        description: 'User created successfully',
        schema: {
            example: {
                message: 'User created',
                data: { id: '00000000-0000-4000-a100-000000000002', email: 'user@demo-shop.com', name: 'New User', isActive: true },
            },
        },
    })
    @ApiStandardErrors()
    async create(@CurrentUser() user: RequestUser, @Body() dto: CreateUserDto) {
        const created = await this.usersService.create(user.tenantId, dto);
        return ApiResponseBuilder.success(created, 'User created');
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a user' })
    @ApiOkResponse({
        description: 'User updated successfully',
        schema: {
            example: {
                message: 'User updated',
                data: { id: '00000000-0000-4000-a100-000000000001', email: 'admin@demo-shop.com', name: 'Updated Name' },
            },
        },
    })
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
    @ApiOperation({ summary: 'Toggle user active status', description: 'Activates or deactivates a user account. Deactivated users cannot log in.' })
    @ApiOkResponse({
        description: 'User status updated',
        schema: {
            example: {
                message: 'User status updated',
                data: { id: '00000000-0000-4000-a100-000000000001', isActive: false },
            },
        },
    })
    @ApiStandardErrors()
    async updateStatus(
        @CurrentUser() user: RequestUser,
        @Param('id') id: string,
        @Body() dto: UpdateUserStatusDto,
    ) {
        const updated = await this.usersService.updateStatus(user.tenantId, id, dto.isActive);
        return ApiResponseBuilder.success(updated, 'User status updated');
    }
}
