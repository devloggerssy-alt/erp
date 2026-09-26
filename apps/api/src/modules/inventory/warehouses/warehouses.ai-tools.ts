import { Injectable } from '@nestjs/common';
import { resources } from '@devloggers/api-contracts';
import { AiToolProvider, defineCrudAiTools, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { WarehousesService } from './services/warehouses.service';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto';
import { WAREHOUSES_FILTER_SCHEMA } from './controllers/warehouses.controller';

@AiToolProvider()
@Injectable()
export class WarehousesAiTools implements AiToolSource {
    constructor(private readonly warehouses: WarehousesService) {}

    aiTools(): readonly AiTool[] {
        return defineCrudAiTools({
            prefix: 'warehouses',
            resource: resources.warehouses.key,
            domain: 'inventory',
            label: 'warehouse',
            service: this.warehouses,
            createDto: CreateWarehouseDto,
            updateDto: UpdateWarehouseDto,
            filterSchema: WAREHOUSES_FILTER_SCHEMA,
            searchFields: ['code', 'name'],
            permissions: { view: 'warehouses.view', create: 'warehouses.create', update: 'warehouses.update' },
        });
    }
}
