import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WarehousesService } from '../services/warehouses.service';
import { CreateWarehouseDto, UpdateWarehouseDto, WarehouseResponseDto } from '../dto';
import { createStandardCrudControllerBase, type StandardCrudOpenApi } from '@devloggers/backend-core';
import { JwtAuthGuard } from '@/modules/identity/auth/guards';

const WAREHOUSES_OPENAPI = {
    list: {
        operation: { summary: 'List warehouses' },
        responseDescription: 'Paginated list of warehouses',
    },
    show: {
        operation: { summary: 'Get a warehouse by ID' },
        responseDescription: 'Warehouse details',
        idParam: { description: 'Warehouse UUID' },
    },
    create: {
        operation: { summary: 'Create a warehouse', description: 'Warehouse code must be unique within the tenant.' },
        responseDescription: 'Warehouse created successfully',
    },
    update: {
        operation: { summary: 'Update a warehouse', description: 'Partial update — only provided fields are changed.' },
        responseDescription: 'Updated warehouse',
        idParam: { description: 'Warehouse UUID' },
    },
    delete: {
        operation: { summary: 'Delete a warehouse' },
        noContentDescription: 'Warehouse deleted successfully',
        idParam: { description: 'Warehouse UUID' },
    },
} satisfies StandardCrudOpenApi;

const WarehousesCrudBase = createStandardCrudControllerBase({
    responseDto: WarehouseResponseDto,
    createDto: CreateWarehouseDto,
    updateDto: UpdateWarehouseDto,
    openApi: WAREHOUSES_OPENAPI,
});

@ApiTags('Inventory / Warehouses')
@Controller('warehouses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class WarehousesController extends WarehousesCrudBase {
    constructor(private readonly warehousesService: WarehousesService) {
        super(warehousesService, 'Warehouse');
    }
}
