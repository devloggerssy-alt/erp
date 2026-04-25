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
import { ApiTags, ApiBearerAuth, ApiQuery, ApiOperation, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { PartiesService } from './parties.service';
import { CreatePartyDto, UpdatePartyDto, UpdatePartyStatusDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, RequestUser } from '../auth/decorators';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';
import { ApiStandardErrors } from '../../common/decorators/api-swagger.decorators';

@ApiTags('Parties')
@Controller('parties')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PartiesController {
    constructor(private readonly partiesService: PartiesService) {}

    @Get()
    @ApiOperation({ summary: 'List all parties (customers / suppliers)' })
    @ApiQuery({ name: 'type', required: false, enum: ['CUSTOMER', 'SUPPLIER', 'CUSTOMER_SUPPLIER'] })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiOkResponse({
        description: 'Paginated list of parties',
        schema: {
            example: {
                message: 'Parties list',
                data: [
                    { id: '00000000-0000-4000-aa00-000000000001', name: 'Aleppo Electronics Co.', type: 'CUSTOMER', isActive: true },
                    { id: '00000000-0000-4000-aa00-000000000004', name: 'Damascus Import Co.', type: 'SUPPLIER', isActive: true },
                ],
                meta: { pagination: { total: 6, page: 1, limit: 50, totalPages: 1 } },
            },
        },
    })
    @ApiStandardErrors()
    async findAll(
        @CurrentUser() user: RequestUser,
        @Query('type') type?: 'CUSTOMER' | 'SUPPLIER' | 'CUSTOMER_SUPPLIER',
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        const result = await this.partiesService.findAll(
            user.tenantId,
            type,
            page ? Number(page) : 1,
            limit ? Number(limit) : 50,
        );
        return ApiResponseBuilder.success(result.data, 'Parties list', {
            pagination: {
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: Math.ceil(result.total / result.limit),
            },
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get party by ID' })
    @ApiOkResponse({
        description: 'Party details returned',
        schema: {
            example: {
                message: 'Party details',
                data: { id: '00000000-0000-4000-aa00-000000000001', name: 'Aleppo Electronics Co.', type: 'CUSTOMER', phone: '+963-21-000-0001', isActive: true },
            },
        },
    })
    @ApiStandardErrors()
    async findOne(
        @CurrentUser() user: RequestUser,
        @Param('id') id: string,
    ) {
        const party = await this.partiesService.findById(user.tenantId, id);
        return ApiResponseBuilder.success(party, 'Party details');
    }

    @Post()
    @ApiOperation({ summary: 'Create a new party' })
    @ApiCreatedResponse({
        description: 'Party created',
        schema: {
            example: {
                message: 'Party created',
                data: { id: '00000000-0000-4000-aa00-000000000007', name: 'New Customer', type: 'CUSTOMER', isActive: true },
            },
        },
    })
    @ApiStandardErrors()
    async create(@CurrentUser() user: RequestUser, @Body() dto: CreatePartyDto) {
        const created = await this.partiesService.create(user.tenantId, dto);
        return ApiResponseBuilder.success(created, 'Party created');
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a party' })
    @ApiOkResponse({
        description: 'Party updated',
        schema: {
            example: {
                message: 'Party updated',
                data: { id: '00000000-0000-4000-aa00-000000000001', name: 'Aleppo Electronics Co. (Updated)' },
            },
        },
    })
    @ApiStandardErrors()
    async update(
        @CurrentUser() user: RequestUser,
        @Param('id') id: string,
        @Body() dto: UpdatePartyDto,
    ) {
        const updated = await this.partiesService.update(user.tenantId, id, dto);
        return ApiResponseBuilder.success(updated, 'Party updated');
    }

    @Patch(':id/status')
    @ApiOperation({ summary: 'Toggle party active status', description: 'Activates or deactivates a party. Deactivated parties cannot be selected in new invoices or payments.' })
    @ApiOkResponse({
        description: 'Party status updated',
        schema: {
            example: {
                message: 'Party status updated',
                data: { id: '00000000-0000-4000-aa00-000000000001', isActive: false },
            },
        },
    })
    @ApiStandardErrors()
    async updateStatus(
        @CurrentUser() user: RequestUser,
        @Param('id') id: string,
        @Body() dto: UpdatePartyStatusDto,
    ) {
        const updated = await this.partiesService.updateStatus(user.tenantId, id, dto.isActive);
        return ApiResponseBuilder.success(updated, 'Party status updated');
    }
}
