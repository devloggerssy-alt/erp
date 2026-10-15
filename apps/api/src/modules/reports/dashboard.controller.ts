import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard, PermissionsGuard } from '../identity/auth/guards';
import { CurrentUser, RequestUser } from '../identity/auth/decorators';
import { RequirePermission } from '@devloggers/backend-core';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';
import { ApiOkResponseStandard, ApiStandardErrors } from '../../common/decorators/api-swagger.decorators';
import {
    DashboardChartPointDto,
    DashboardExpenseBreakdownItemDto,
    DashboardSummaryResponseDto,
    DashboardTopItemDto,
} from './dto';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class DashboardController {
    constructor(private readonly reportsService: ReportsService) {}

    @Get('summary')
    @RequirePermission('dashboard.view')
    @ApiOperation({ summary: 'Get dashboard summary', description: 'Key business metrics for the selected date range. Defaults to current calendar month.' })
    @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO 8601)' })
    @ApiQuery({ name: 'to', required: false, description: 'End date (ISO 8601)' })
    @ApiOkResponseStandard(DashboardSummaryResponseDto, { description: 'Dashboard summary data' })
    @ApiStandardErrors()
    async summary(
        @CurrentUser() user: RequestUser,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        return ApiResponseBuilder.success(
            await this.reportsService.getDashboardSummary(user.tenantId, { from, to }),
            'Dashboard summary',
        );
    }

    @Get('chart-data')
    @RequirePermission('dashboard.view')
    @ApiOperation({ summary: 'Get dashboard chart data', description: 'Day-by-day sales and purchases totals for the selected date range (max 90 days).' })
    @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO 8601)' })
    @ApiQuery({ name: 'to', required: false, description: 'End date (ISO 8601)' })
    @ApiOkResponseStandard(DashboardChartPointDto, { isArray: true, description: 'Chart data points' })
    @ApiStandardErrors()
    async chartData(
        @CurrentUser() user: RequestUser,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        return ApiResponseBuilder.success(
            await this.reportsService.getDashboardChartData(user.tenantId, { from, to }),
            'Chart data',
        );
    }

    @Get('expense-breakdown')
    @RequirePermission('dashboard.view')
    @ApiOperation({
        summary: 'Get dashboard expense breakdown',
        description: 'Posted expense totals grouped by GL account for the selected date range (top 5 + "Other"). Defaults to current calendar month.',
    })
    @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO 8601)' })
    @ApiQuery({ name: 'to', required: false, description: 'End date (ISO 8601)' })
    @ApiOkResponseStandard(DashboardExpenseBreakdownItemDto, { isArray: true, description: 'Expense breakdown by account' })
    @ApiStandardErrors()
    async expenseBreakdown(
        @CurrentUser() user: RequestUser,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        return ApiResponseBuilder.success(
            await this.reportsService.getDashboardExpenseBreakdown(user.tenantId, { from, to }),
            'Expense breakdown',
        );
    }

    @Get('top-items')
    @RequirePermission('dashboard.view')
    @ApiOperation({
        summary: 'Get dashboard top-selling items',
        description: 'Top items by posted sales revenue for the selected date range. Defaults to current calendar month.',
    })
    @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO 8601)' })
    @ApiQuery({ name: 'to', required: false, description: 'End date (ISO 8601)' })
    @ApiQuery({ name: 'limit', required: false, type: String, description: 'Max items to return (default 5, max 10)' })
    @ApiOkResponseStandard(DashboardTopItemDto, { isArray: true, description: 'Top-selling items' })
    @ApiStandardErrors()
    async topItems(
        @CurrentUser() user: RequestUser,
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('limit') limit?: string,
    ) {
        const parsedLimit = limit ? Math.min(10, Math.max(1, parseInt(limit, 10) || 5)) : 5;
        return ApiResponseBuilder.success(
            await this.reportsService.getDashboardTopItems(user.tenantId, { from, to, limit: parsedLimit }),
            'Top items',
        );
    }
}
