import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, PermissionsGuard } from '@/modules/identity/auth/guards';
import { CurrentUser, type RequestUser } from '@/modules/identity/auth/decorators';
import { RequirePermission } from '@devloggers/backend-core';
import { ApiResponseBuilder } from '@/common/api/api-response-builder';
import { ApiStandardErrors, ApiOkResponseStandard } from '@/common/decorators/api-swagger.decorators';
import { OpeningBalanceSessionsService } from './opening-balance-sessions.service';
import {
    CreateOpeningBalanceSessionDto,
    UpdateOpeningBalanceSessionDto,
    OpeningBalanceSessionResponseDto,
} from '../dto/opening-balance-session.dto';

@ApiTags('Accounting / Opening Balances')
@Controller('accounting/opening-balance-sessions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class OpeningBalanceSessionsController {
    constructor(private readonly service: OpeningBalanceSessionsService) {}

    @Post()
    @RequirePermission('openingBalances.manage')
    @ApiOperation({ summary: 'Create an opening balance session (DRAFT)' })
    @ApiOkResponseStandard(OpeningBalanceSessionResponseDto, { description: 'Session created' })
    @ApiStandardErrors()
    async create(@CurrentUser() user: RequestUser, @Body() dto: CreateOpeningBalanceSessionDto) {
        const result = await this.service.createAs(user.tenantId, user.id, dto);
        return ApiResponseBuilder.success(result, 'Opening balance session created');
    }

    @Get()
    @RequirePermission('openingBalanceSessions.view')
    @ApiOperation({ summary: 'List opening balance sessions' })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiOkResponseStandard(OpeningBalanceSessionResponseDto, { description: 'Sessions', isArray: true })
    @ApiStandardErrors()
    async list(
        @CurrentUser() user: RequestUser,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const safePage = Math.max(1, Number(page) || 1);
        const safeLimit = Math.min(100, Math.max(1, Number(limit) || 100));
        const { data, total } = await this.service.list(user.tenantId, {
            skip: (safePage - 1) * safeLimit,
            take: safeLimit,
        });
        return ApiResponseBuilder.success(data, 'Opening balance sessions', {
            pagination: { total, page: safePage, limit: safeLimit, totalPages: Math.ceil(total / safeLimit) },
        });
    }

    @Get(':id')
    @RequirePermission('openingBalanceSessions.view')
    @ApiParam({ name: 'id', description: 'Session UUID' })
    @ApiOkResponseStandard(OpeningBalanceSessionResponseDto, { description: 'Session with lines' })
    @ApiStandardErrors()
    async show(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        const result = await this.service.findById(user.tenantId, id);
        return ApiResponseBuilder.success(result, 'Opening balance session');
    }

    @Patch(':id')
    @RequirePermission('openingBalances.manage')
    @ApiParam({ name: 'id', description: 'Session UUID' })
    @ApiOkResponseStandard(OpeningBalanceSessionResponseDto, { description: 'Session updated (DRAFT only)' })
    @ApiStandardErrors()
    async update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateOpeningBalanceSessionDto) {
        const result = await this.service.update(user.tenantId, id, dto);
        return ApiResponseBuilder.success(result, 'Opening balance session updated');
    }

    @Delete(':id')
    @RequirePermission('openingBalances.manage')
    @ApiParam({ name: 'id', description: 'Session UUID' })
    @ApiOkResponseStandard(OpeningBalanceSessionResponseDto, { description: 'Session deleted (DRAFT only)' })
    @ApiStandardErrors()
    async remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        await this.service.remove(user.tenantId, id);
        return ApiResponseBuilder.success(null, 'Opening balance session deleted');
    }

    @Post(':id/validate')
    @RequirePermission('openingBalances.manage')
    @ApiParam({ name: 'id', description: 'Session UUID' })
    @ApiOkResponseStandard(OpeningBalanceSessionResponseDto, { description: 'DRAFT → VALIDATED' })
    @ApiStandardErrors()
    async validate(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        const result = await this.service.validate(user.tenantId, id);
        return ApiResponseBuilder.success(result, 'Session validated');
    }

    @Post(':id/review')
    @RequirePermission('openingBalances.manage')
    @ApiParam({ name: 'id', description: 'Session UUID' })
    @ApiOkResponseStandard(OpeningBalanceSessionResponseDto, { description: 'VALIDATED → REVIEWED' })
    @ApiStandardErrors()
    async review(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        const result = await this.service.review(user.tenantId, id);
        return ApiResponseBuilder.success(result, 'Session reviewed');
    }

    @Post(':id/post')
    @RequirePermission('openingBalances.manage')
    @ApiParam({ name: 'id', description: 'Session UUID' })
    @ApiOkResponseStandard(OpeningBalanceSessionResponseDto, { description: 'REVIEWED → POSTED; posts the balanced JE via AccountingPostingFacade and syncs cash/bank projections' })
    @ApiStandardErrors()
    async post(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        const result = await this.service.post(user.tenantId, id, user.id);
        return ApiResponseBuilder.success(result, 'Session posted');
    }

    @Post(':id/lock')
    @RequirePermission('openingBalances.manage')
    @ApiParam({ name: 'id', description: 'Session UUID' })
    @ApiOkResponseStandard(OpeningBalanceSessionResponseDto, { description: 'POSTED → LOCKED; prevents silent edit' })
    @ApiStandardErrors()
    async lock(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        const result = await this.service.lock(user.tenantId, id, user.id);
        return ApiResponseBuilder.success(result, 'Session locked');
    }
}