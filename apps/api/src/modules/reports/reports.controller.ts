import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, RequestUser } from '../auth/decorators';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';
import { ApiStandardErrors } from '../../common/decorators/api-swagger.decorators';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) {}

    @Get('stock-balance')
    @ApiOperation({ summary: 'Stock balance report', description: 'Returns current stock quantities grouped by item and warehouse. Optionally filter by a specific warehouse.' })
    @ApiQuery({ name: 'warehouseId', required: false, description: 'Filter by warehouse ID' })
    @ApiOkResponse({
        description: 'Stock balance report data',
        schema: {
            example: {
                message: 'Stock balance report',
                data: [
                    { itemId: '...', itemName: 'Laptop 15"', warehouseId: '...', warehouseName: 'Main Warehouse', quantity: 50 },
                ],
            },
        },
    })
    @ApiStandardErrors()
    async stockBalance(@CurrentUser() user: RequestUser, @Query('warehouseId') warehouseId?: string) {
        return ApiResponseBuilder.success(await this.reportsService.getStockBalance(user.tenantId, warehouseId), 'Stock balance report');
    }

    @Get('sales-summary')
    @ApiOperation({ summary: 'Sales summary report', description: 'Aggregates total sales amounts, invoice count, and top-selling items within an optional date range. Can be filtered by party.' })
    @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO 8601)' })
    @ApiQuery({ name: 'to', required: false, description: 'End date (ISO 8601)' })
    @ApiQuery({ name: 'partyId', required: false, description: 'Filter by customer/party ID' })
    @ApiOkResponse({
        description: 'Sales summary report data',
        schema: {
            example: {
                message: 'Sales summary report',
                data: { totalSales: 15000000, invoiceCount: 12, topItems: [{ itemName: 'Laptop 15"', totalQty: 20, totalAmount: 12000000 }] },
            },
        },
    })
    @ApiStandardErrors()
    async salesSummary(@CurrentUser() user: RequestUser, @Query('from') from?: string, @Query('to') to?: string, @Query('partyId') partyId?: string) {
        return ApiResponseBuilder.success(await this.reportsService.getSalesSummary(user.tenantId, { from, to, partyId }), 'Sales summary report');
    }

    @Get('purchase-summary')
    @ApiOperation({ summary: 'Purchase summary report', description: 'Aggregates total purchase amounts, invoice count, and top purchased items within an optional date range. Can be filtered by supplier.' })
    @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO 8601)' })
    @ApiQuery({ name: 'to', required: false, description: 'End date (ISO 8601)' })
    @ApiQuery({ name: 'partyId', required: false, description: 'Filter by supplier/party ID' })
    @ApiOkResponse({
        description: 'Purchase summary report data',
        schema: {
            example: {
                message: 'Purchase summary report',
                data: { totalPurchases: 8000000, invoiceCount: 5, topItems: [{ itemName: 'Smartphone X', totalQty: 50, totalAmount: 5600000 }] },
            },
        },
    })
    @ApiStandardErrors()
    async purchaseSummary(@CurrentUser() user: RequestUser, @Query('from') from?: string, @Query('to') to?: string, @Query('partyId') partyId?: string) {
        return ApiResponseBuilder.success(await this.reportsService.getPurchaseSummary(user.tenantId, { from, to, partyId }), 'Purchase summary report');
    }

    @Get('customer-statement')
    @ApiOperation({ summary: 'Customer statement', description: 'Returns a detailed transaction history for a customer, including invoices, payments received, and running balance.' })
    @ApiQuery({ name: 'partyId', required: true, description: 'Customer party ID' })
    @ApiOkResponse({
        description: 'Customer statement data',
        schema: {
            example: {
                message: 'Customer statement',
                data: {
                    partyName: 'Aleppo Electronics Co.',
                    openingBalance: 0,
                    transactions: [{ date: '2026-04-14', type: 'INVOICE', amount: 600000, runningBalance: 600000 }],
                    closingBalance: 600000,
                },
            },
        },
    })
    @ApiStandardErrors()
    async customerStatement(@CurrentUser() user: RequestUser, @Query('partyId') partyId: string) {
        return ApiResponseBuilder.success(await this.reportsService.getPartyStatement(user.tenantId, partyId), 'Customer statement');
    }

    @Get('supplier-statement')
    @ApiOperation({ summary: 'Supplier statement', description: 'Returns a detailed transaction history for a supplier, including purchase invoices, payments made, and running balance.' })
    @ApiQuery({ name: 'partyId', required: true, description: 'Supplier party ID' })
    @ApiOkResponse({
        description: 'Supplier statement data',
        schema: {
            example: {
                message: 'Supplier statement',
                data: {
                    partyName: 'Damascus Import Co.',
                    openingBalance: 0,
                    transactions: [{ date: '2026-04-14', type: 'INVOICE', amount: 5740000, runningBalance: 5740000 }],
                    closingBalance: 5740000,
                },
            },
        },
    })
    @ApiStandardErrors()
    async supplierStatement(@CurrentUser() user: RequestUser, @Query('partyId') partyId: string) {
        return ApiResponseBuilder.success(await this.reportsService.getPartyStatement(user.tenantId, partyId), 'Supplier statement');
    }

    @Get('profit-summary')
    @ApiOperation({ summary: 'Profit summary report', description: 'Calculates gross profit by comparing total sales revenue against cost of goods sold within an optional date range.' })
    @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO 8601)' })
    @ApiQuery({ name: 'to', required: false, description: 'End date (ISO 8601)' })
    @ApiOkResponse({
        description: 'Profit summary report data',
        schema: {
            example: {
                message: 'Profit summary report',
                data: { totalRevenue: 15000000, totalCost: 8000000, grossProfit: 7000000, profitMargin: 46.67 },
            },
        },
    })
    @ApiStandardErrors()
    async profitSummary(@CurrentUser() user: RequestUser, @Query('from') from?: string, @Query('to') to?: string) {
        return ApiResponseBuilder.success(await this.reportsService.getProfitSummary(user.tenantId, { from, to }), 'Profit summary report');
    }
}

export { ReportsService };
