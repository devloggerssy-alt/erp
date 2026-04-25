import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { CashboxesService } from './cashboxes.service';
import { CreateCashboxDto, UpdateCashboxDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, RequestUser } from '../auth/decorators';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';
import { ApiStandardErrors } from '../../common/decorators/api-swagger.decorators';

@ApiTags('Cashboxes')
@Controller('cashboxes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CashboxesController {
    constructor(private readonly cashboxesService: CashboxesService) {}

    @Get()
    @ApiOperation({ summary: 'List all cashboxes' })
    @ApiOkResponse({
        description: 'Cashboxes list retrieved',
        schema: {
            example: {
                message: 'Cashboxes list',
                data: [
                    { id: '00000000-0000-4000-af00-000000000001', name: 'Main Cashbox', currencyId: '00000000-0000-4000-a300-000000000001', balance: 5000000 },
                ],
            },
        },
    })
    @ApiStandardErrors()
    async findAll(@CurrentUser() user: RequestUser) {
        const result = await this.cashboxesService.findAll(user.tenantId);
        return ApiResponseBuilder.success(result, 'Cashboxes list');
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get cashbox by ID' })
    @ApiOkResponse({
        description: 'Cashbox details returned',
        schema: {
            example: {
                message: 'Cashbox details',
                data: { id: '00000000-0000-4000-af00-000000000001', name: 'Main Cashbox', balance: 5000000 },
            },
        },
    })
    @ApiStandardErrors()
    async findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        return ApiResponseBuilder.success(await this.cashboxesService.findById(user.tenantId, id), 'Cashbox details');
    }

    @Post()
    @ApiOperation({ summary: 'Create a new cashbox' })
    @ApiCreatedResponse({
        description: 'Cashbox created',
        schema: {
            example: {
                message: 'Cashbox created',
                data: { id: '00000000-0000-4000-af00-000000000002', name: 'Branch Cashbox', balance: 0 },
            },
        },
    })
    @ApiStandardErrors()
    async create(@CurrentUser() user: RequestUser, @Body() dto: CreateCashboxDto) {
        return ApiResponseBuilder.success(await this.cashboxesService.create(user.tenantId, dto), 'Cashbox created');
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a cashbox' })
    @ApiOkResponse({
        description: 'Cashbox updated',
        schema: {
            example: {
                message: 'Cashbox updated',
                data: { id: '00000000-0000-4000-af00-000000000001', name: 'Main Cashbox (Renamed)' },
            },
        },
    })
    @ApiStandardErrors()
    async update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateCashboxDto) {
        return ApiResponseBuilder.success(await this.cashboxesService.update(user.tenantId, id, dto), 'Cashbox updated');
    }
}
