import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard, PermissionsGuard } from '../identity/auth/guards';
import { CurrentUser, RequestUser } from '../identity/auth/decorators';
import { RequirePermission } from '@devloggers/backend-core';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';
import { ApiStandardErrors } from '../../common/decorators/api-swagger.decorators';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) {}
    @Get('stock-balance')
    @RequirePermission('reports.view')
    @ApiOperation({ summary: 'Stock balance report', description: 'Returns current stock quantities grouped by item and warehouse. Optionally filter by a specific warehouse.' })
    @ApiQuery({ name: 'warehouseId', required: false, description: 'Filter by warehouse ID' })
    @ApiOkResponse({
        description: 'Stock balance report data',
        schema: {
            example: {
                message: 'Stock balance report',
                data: [
                    {
                        itemId: 'b1f2…',
                        itemName: 'Laptop 15"',
                        itemCode: 'LAP-15',
                        warehouseId: 'a3c4…',
                        warehouseName: 'Main Warehouse',
                        warehouseCode: 'MAIN',
                        quantity: 50,
                        averageCost: 1200.5,
                        updatedAt: '2026-04-14T09:30:00.000Z',
                    },
                ],
            },
        },
    })
    @ApiStandardErrors()
    async stockBalance(@CurrentUser() user: RequestUser, @Query('warehouseId') warehouseId?: string) {
        return ApiResponseBuilder.success(await this.reportsService.getStockBalance(user.tenantId, warehouseId), 'Stock balance report');
    }

    
    @Get('sales-summary')
    @RequirePermission('reports.view')
    @ApiOperation({ summary: 'Sales summary report', description: 'Aggregates total sales amounts, invoice count, and top-selling items within an optional date range. Can be filtered by party.' })
    @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO 8601)' })
    @ApiQuery({ name: 'to', required: false, description: 'End date (ISO 8601)' })
    @ApiQuery({ name: 'partyId', required: false, description: 'Filter by customer/party ID' })
    @ApiOkResponse({
        description: 'Sales summary report data',
        schema: {
            example: {
                message: 'Sales summary report',
                data: {
                    invoices: [
                        {
                            id: 'd4e5…',
                            number: 'SI-2026-0001',
                            date: '2026-04-14T09:30:00.000Z',
                            total: 600000,
                            partyId: 'c9d8…',
                            party: { name: 'Aleppo Electronics Co.', code: 'C-001' },
                        },
                    ],
                    totalSales: 15000000,
                    count: 12,
                },
            },
        },
    })
    @ApiStandardErrors()
    async salesSummary(@CurrentUser() user: RequestUser, @Query('from') from?: string, @Query('to') to?: string, @Query('partyId') partyId?: string) {
        return ApiResponseBuilder.success(await this.reportsService.getSalesSummary(user.tenantId, { from, to, partyId }), 'Sales summary report');
    }



    @Get('purchase-summary')
    @RequirePermission('reports.view')
    @ApiOperation({ summary: 'Purchase summary report', description: 'Aggregates total purchase amounts, invoice count, and top purchased items within an optional date range. Can be filtered by supplier.' })
    @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO 8601)' })
    @ApiQuery({ name: 'to', required: false, description: 'End date (ISO 8601)' })
    @ApiQuery({ name: 'partyId', required: false, description: 'Filter by supplier/party ID' })
    @ApiOkResponse({
        description: 'Purchase summary report data',
        schema: {
            example: {
                message: 'Purchase summary report',
                data: {
                    invoices: [
                        {
                            id: 'e5f6…',
                            number: 'PI-2026-0004',
                            date: '2026-04-13T11:00:00.000Z',
                            total: 1148000,
                            partyId: 'f7a8…',
                            party: { name: 'Damascus Import Co.', code: 'S-004' },
                        },
                    ],
                    totalPurchases: 8000000,
                    count: 5,
                },
            },
        },
    })
    @ApiStandardErrors()
    async purchaseSummary(@CurrentUser() user: RequestUser, @Query('from') from?: string, @Query('to') to?: string, @Query('partyId') partyId?: string) {
        return ApiResponseBuilder.success(await this.reportsService.getPurchaseSummary(user.tenantId, { from, to, partyId }), 'Purchase summary report');
    }

    @Get('customer-statement')
    @RequirePermission('reports.view')
    @ApiOperation({ summary: 'Customer statement', description: 'Returns a detailed transaction history for a customer, including invoices, payments received, and running balance.' })
    @ApiQuery({ name: 'partyId', required: true, description: 'Customer party ID' })
    @ApiOkResponse({
        description: 'Customer statement data',
        schema: {
            example: {
                message: 'Customer statement',
                data: {
                    party: { id: 'c9d8…', name: 'Aleppo Electronics Co.', code: 'C-001' },
                    invoices: [
                        {
                            id: 'd4e5…',
                            number: 'SI-2026-0001',
                            date: '2026-04-14T09:30:00.000Z',
                            total: 600000,
                            partyId: 'c9d8…',
                            party: { name: 'Aleppo Electronics Co.', code: 'C-001' },
                        },
                    ],
                    payments: [{ id: 'a1b2…', date: '2026-04-15T12:00:00.000Z', amount: 200000 }],
                    totalInvoiced: 600000,
                    totalPaid: 200000,
                    balance: 400000,
                },
            },
        },
    })
    @ApiStandardErrors()
    async customerStatement(@CurrentUser() user: RequestUser, @Query('partyId') partyId: string) {
        return ApiResponseBuilder.success(await this.reportsService.getPartyStatement(user.tenantId, partyId), 'Customer statement');
    }

    @Get('supplier-statement')
    @RequirePermission('reports.view')
    @ApiOperation({ summary: 'Supplier statement', description: 'Returns a detailed transaction history for a supplier, including purchase invoices, payments made, and running balance.' })
    @ApiQuery({ name: 'partyId', required: true, description: 'Supplier party ID' })
    @ApiOkResponse({
        description: 'Supplier statement data',
        schema: {
            example: {
                message: 'Supplier statement',
                data: {
                    party: { id: 'f7a8…', name: 'Damascus Import Co.', code: 'S-004' },
                    invoices: [
                        {
                            id: 'e5f6…',
                            number: 'PI-2026-0004',
                            date: '2026-04-13T11:00:00.000Z',
                            total: 5740000,
                            partyId: 'f7a8…',
                            party: { name: 'Damascus Import Co.', code: 'S-004' },
                        },
                    ],
                    payments: [{ id: 'b2c3…', date: '2026-04-16T08:15:00.000Z', amount: 5740000 }],
                    totalInvoiced: 5740000,
                    totalPaid: 5740000,
                    balance: 0,
                },
            },
        },
    })
    @ApiStandardErrors()
    async supplierStatement(@CurrentUser() user: RequestUser, @Query('partyId') partyId: string) {
        return ApiResponseBuilder.success(await this.reportsService.getPartyStatement(user.tenantId, partyId), 'Supplier statement');
    }

    @Get('profit-summary')
    @RequirePermission('reports.view')
    @ApiOperation({ summary: 'Profit summary report', description: 'Calculates gross profit by comparing total sales revenue against cost of goods sold within an optional date range.' })
    @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO 8601)' })
    @ApiQuery({ name: 'to', required: false, description: 'End date (ISO 8601)' })
    @ApiOkResponse({
        description: 'Profit summary report data',
        schema: {
            example: {
                message: 'Profit summary report',
                data: {
                    totalSales: 15000000,
                    totalPurchases: 8000000,
                    totalExpenses: 2000000,
                    grossProfit: 7000000,
                    netProfit: 5000000,
                },
            },
        },
    })
    @ApiStandardErrors()
    async profitSummary(@CurrentUser() user: RequestUser, @Query('from') from?: string, @Query('to') to?: string) {
        return ApiResponseBuilder.success(await this.reportsService.getProfitSummary(user.tenantId, { from, to }), 'Profit summary report');
    }
}

export { ReportsService };
