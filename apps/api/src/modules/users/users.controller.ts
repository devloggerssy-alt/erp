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
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UpdateUserStatusDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, RequestUser } from '../auth/decorators';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get()
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
    async create(@CurrentUser() user: RequestUser, @Body() dto: CreateUserDto) {
        const created = await this.usersService.create(user.tenantId, dto);
        return ApiResponseBuilder.success(created, 'User created');
    }

    @Patch(':id')
    async update(
        @CurrentUser() user: RequestUser,
        @Param('id') id: string,
        @Body() dto: UpdateUserDto,
    ) {
        const updated = await this.usersService.update(user.tenantId, id, dto);
        return ApiResponseBuilder.success(updated, 'User updated');
    }

    @Patch(':id/status')
    async updateStatus(
        @CurrentUser() user: RequestUser,
        @Param('id') id: string,
        @Body() dto: UpdateUserStatusDto,
    ) {
        const updated = await this.usersService.updateStatus(user.tenantId, id, dto.isActive);
        return ApiResponseBuilder.success(updated, 'User status updated');
    }
}
