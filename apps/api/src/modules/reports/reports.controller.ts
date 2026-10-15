import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard, PermissionsGuard } from '../identity/auth/guards';
import { CurrentUser, RequestUser } from '../identity/auth/decorators';
import { RequirePermission } from '@devloggers/backend-core';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';
import { ApiOkResponseStandard, ApiStandardErrors } from '../../common/decorators/api-swagger.decorators';
import {
    PartyStatementResponseDto,
    ProfitSummaryResponseDto,
    PurchaseSummaryResponseDto,
    SalesSummaryResponseDto,
    StockBalanceReportItemDto,
} from './dto';

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
    @ApiOkResponseStandard(StockBalanceReportItemDto, { isArray: true, description: 'Stock balance report data' })
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
    @ApiOkResponseStandard(SalesSummaryResponseDto, { description: 'Sales summary report data' })
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
    @ApiOkResponseStandard(PurchaseSummaryResponseDto, { description: 'Purchase summary report data' })
    @ApiStandardErrors()
    async purchaseSummary(@CurrentUser() user: RequestUser, @Query('from') from?: string, @Query('to') to?: string, @Query('partyId') partyId?: string) {
        return ApiResponseBuilder.success(await this.reportsService.getPurchaseSummary(user.tenantId, { from, to, partyId }), 'Purchase summary report');
    }

    @Get('customer-statement')
    @RequirePermission('reports.view')
    @ApiOperation({ summary: 'Customer statement', description: 'Returns a detailed transaction history for a customer, including invoices, payments received, and running balance.' })
    @ApiQuery({ name: 'partyId', required: true, description: 'Customer party ID' })
    @ApiOkResponseStandard(PartyStatementResponseDto, { description: 'Customer statement data' })
    @ApiStandardErrors()
    async customerStatement(@CurrentUser() user: RequestUser, @Query('partyId') partyId: string) {
        return ApiResponseBuilder.success(await this.reportsService.getPartyStatement(user.tenantId, partyId), 'Customer statement');
    }

    @Get('supplier-statement')
    @RequirePermission('reports.view')
    @ApiOperation({ summary: 'Supplier statement', description: 'Returns a detailed transaction history for a supplier, including purchase invoices, payments made, and running balance.' })
    @ApiQuery({ name: 'partyId', required: true, description: 'Supplier party ID' })
    @ApiOkResponseStandard(PartyStatementResponseDto, { description: 'Supplier statement data' })
    @ApiStandardErrors()
    async supplierStatement(@CurrentUser() user: RequestUser, @Query('partyId') partyId: string) {
        return ApiResponseBuilder.success(await this.reportsService.getPartyStatement(user.tenantId, partyId), 'Supplier statement');
    }

    @Get('profit-summary')
    @RequirePermission('reports.view')
    @ApiOperation({ summary: 'Profit summary report', description: 'Calculates gross profit by comparing total sales revenue against cost of goods sold within an optional date range.' })
    @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO 8601)' })
    @ApiQuery({ name: 'to', required: false, description: 'End date (ISO 8601)' })
    @ApiOkResponseStandard(ProfitSummaryResponseDto, { description: 'Profit summary report data' })
    @ApiStandardErrors()
    async profitSummary(@CurrentUser() user: RequestUser, @Query('from') from?: string, @Query('to') to?: string) {
        return ApiResponseBuilder.success(await this.reportsService.getProfitSummary(user.tenantId, { from, to }), 'Profit summary report');
    }
}

export { ReportsService };
