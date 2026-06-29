import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../identity/auth/guards';
import { CurrentUser, RequestUser } from '../identity/auth/decorators';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';
import { ApiStandardErrors } from '../../common/decorators/api-swagger.decorators';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class DashboardController {
    constructor(private readonly reportsService: ReportsService) {}

    @Get('summary')
    @ApiOperation({ summary: 'Get dashboard summary', description: 'Key business metrics for the selected date range. Defaults to current calendar month.' })
    @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO 8601)' })
    @ApiQuery({ name: 'to', required: false, description: 'End date (ISO 8601)' })
    @ApiOkResponse({ description: 'Dashboard summary data' })
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
    @ApiOperation({ summary: 'Get dashboard chart data', description: 'Day-by-day sales and purchases totals for the selected date range (max 90 days).' })
    @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO 8601)' })
    @ApiQuery({ name: 'to', required: false, description: 'End date (ISO 8601)' })
    @ApiOkResponse({
        description: 'Chart data points',
        schema: {
            example: {
                message: 'Chart data',
                data: [{ date: '2026-06-01', sales: 4200, purchases: 1800 }],
            },
        },
    })
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
}
