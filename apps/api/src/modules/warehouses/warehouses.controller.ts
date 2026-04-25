import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto/warehouse.dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, RequestUser } from '../auth/decorators';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';
import { ApiStandardErrors } from '../../common/decorators/api-swagger.decorators';

@ApiTags('Warehouses')
@Controller('warehouses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class WarehousesController {
    constructor(private readonly warehousesService: WarehousesService) {}

    @Get()
    @ApiOperation({ summary: 'List all warehouses' })
    @ApiOkResponse({
        description: 'Warehouses list retrieved',
        schema: {
            example: {
                message: 'Warehouses list',
                data: [
                    { id: '00000000-0000-4000-ab00-000000000001', name: 'Main Warehouse', code: 'WH-MAIN', isActive: true },
                    { id: '00000000-0000-4000-ab00-000000000002', name: 'Branch Warehouse', code: 'WH-BRANCH', isActive: true },
                ],
            },
        },
    })
    @ApiStandardErrors()
    async findAll(@CurrentUser() user: RequestUser) {
        const result = await this.warehousesService.findAll(user.tenantId);
        return ApiResponseBuilder.success(result, 'Warehouses list');
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get warehouse by ID' })
    @ApiOkResponse({
        description: 'Warehouse details returned',
        schema: {
            example: {
                message: 'Warehouse details',
                data: { id: '00000000-0000-4000-ab00-000000000001', name: 'Main Warehouse', code: 'WH-MAIN', isActive: true },
            },
        },
    })
    @ApiStandardErrors()
    async findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        const warehouse = await this.warehousesService.findById(user.tenantId, id);
        return ApiResponseBuilder.success(warehouse, 'Warehouse details');
    }

    @Post()
    @ApiOperation({ summary: 'Create a new warehouse' })
    @ApiCreatedResponse({
        description: 'Warehouse created',
        schema: {
            example: {
                message: 'Warehouse created',
                data: { id: '00000000-0000-4000-ab00-000000000003', name: 'New Warehouse', code: 'WH-NEW', isActive: true },
            },
        },
    })
    @ApiStandardErrors()
    async create(@CurrentUser() user: RequestUser, @Body() dto: CreateWarehouseDto) {
        const created = await this.warehousesService.create(user.tenantId, dto);
        return ApiResponseBuilder.success(created, 'Warehouse created');
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a warehouse' })
    @ApiOkResponse({
        description: 'Warehouse updated',
        schema: {
            example: {
                message: 'Warehouse updated',
                data: { id: '00000000-0000-4000-ab00-000000000001', name: 'Main Warehouse (Renamed)' },
            },
        },
    })
    @ApiStandardErrors()
    async update(
        @CurrentUser() user: RequestUser,
        @Param('id') id: string,
        @Body() dto: UpdateWarehouseDto,
    ) {
        const updated = await this.warehousesService.update(user.tenantId, id, dto);
        return ApiResponseBuilder.success(updated, 'Warehouse updated');
    }
}
