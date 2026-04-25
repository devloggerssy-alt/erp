import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, RequestUser } from '../auth/decorators';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';
import { ApiStandardErrors } from '../../common/decorators/api-swagger.decorators';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class DashboardController {
    constructor(private readonly reportsService: ReportsService) {}

    @Get('summary')
    @ApiOperation({ summary: 'Get dashboard summary', description: 'Returns key business metrics: total revenue, total expenses, outstanding receivables/payables, inventory value, and recent activity counts.' })
    @ApiOkResponse({
        description: 'Dashboard summary data',
        schema: {
            example: {
                message: 'Dashboard summary',
                data: {
                    totalRevenue: 15000000,
                    totalExpenses: 8000000,
                    outstandingReceivables: 3200000,
                    outstandingPayables: 5740000,
                    inventoryValue: 42000000,
                    invoiceCount: 12,
                    paymentCount: 8,
                },
            },
        },
    })
    @ApiStandardErrors()
    async summary(@CurrentUser() user: RequestUser) {
        return ApiResponseBuilder.success(await this.reportsService.getDashboardSummary(user.tenantId), 'Dashboard summary');
    }
}
