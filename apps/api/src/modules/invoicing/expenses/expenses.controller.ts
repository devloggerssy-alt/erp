import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery, ApiOperation, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, UpdateExpenseDto } from './dto';
import { JwtAuthGuard } from '../../identity/auth/guards';
import { CurrentUser, RequestUser } from '../../identity/auth/decorators';
import { ApiResponseBuilder } from '../../../common/api/api-response-builder';
import { ApiStandardErrors } from '../../../common/decorators/api-swagger.decorators';

@ApiTags('Expenses')
@Controller('expenses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ExpensesController {
    constructor(private readonly expensesService: ExpensesService) {}

    @Get()
    @ApiOperation({ summary: 'List all expenses' })
    @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'POSTED', 'CANCELLED'] })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiOkResponse({ description: 'Paginated list of expenses' })
    @ApiStandardErrors()
    async findAll(@CurrentUser() user: RequestUser, @Query('status') status?: string, @Query('page') page?: number, @Query('limit') limit?: number) {
        const result = await this.expensesService.findAll(user.tenantId, { status, page: page ? Number(page) : 1, limit: limit ? Number(limit) : 50 });
        return ApiResponseBuilder.success(result.data, 'Expenses list', { pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: Math.ceil(result.total / result.limit) } });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get expense by ID' })
    @ApiOkResponse({ description: 'Expense details' })
    @ApiStandardErrors()
    async findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        return ApiResponseBuilder.success(await this.expensesService.findById(user.tenantId, id), 'Expense details');
    }

    @Post()
    @ApiOperation({ summary: 'Create a new expense' })
    @ApiCreatedResponse({ description: 'Expense created in DRAFT status' })
    @ApiStandardErrors()
    async create(@CurrentUser() user: RequestUser, @Body() dto: CreateExpenseDto) {
        return ApiResponseBuilder.success(await this.expensesService.create(user.tenantId, user.id, dto), 'Expense created');
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a draft expense' })
    @ApiOkResponse({ description: 'Expense updated' })
    @ApiStandardErrors()
    async update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateExpenseDto) {
        return ApiResponseBuilder.success(await this.expensesService.update(user.tenantId, id, dto), 'Expense updated');
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a draft expense' })
    @ApiOkResponse({ description: 'Expense deleted' })
    @ApiStandardErrors()
    async remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        await this.expensesService.remove(user.tenantId, id);
        return ApiResponseBuilder.success(null, 'Expense deleted');
    }

    @Post(':id/post')
    @ApiOperation({ summary: 'Post (confirm) an expense', description: 'Transitions a DRAFT expense to POSTED: creates a balanced journal entry (debit per item, credit cashbox linked account) and decrements the cashbox balance.' })
    @ApiOkResponse({ description: 'Expense posted — journal entry created, cashbox decremented' })
    @ApiStandardErrors()
    async post(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        return ApiResponseBuilder.success(await this.expensesService.post(user.tenantId, id, user.id), 'Expense posted');
    }

    @Post(':id/cancel')
    @ApiOperation({ summary: 'Cancel a posted expense', description: 'Posts a reversing journal entry and restores the cashbox balance. Only posted expenses can be cancelled.' })
    @ApiOkResponse({ description: 'Expense cancelled — reversing entry created' })
    @ApiStandardErrors()
    async cancel(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        return ApiResponseBuilder.success(await this.expensesService.cancel(user.tenantId, id, user.id), 'Expense cancelled');
    }
}
