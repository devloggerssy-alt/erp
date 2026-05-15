import { Injectable } from '@nestjs/common';
import { CrudPresenter } from '@devloggers/backend-core';
import type { Warehouse } from '@devloggers/db-prisma';
import { WarehouseResponseDto } from '../dto';

@Injectable()
export class WarehousePresenter extends CrudPresenter<Warehouse, WarehouseResponseDto> {
    toResponse(entity: Warehouse): WarehouseResponseDto {
        return {
            id: entity.id,
            code: entity.code,
            name: entity.name,
            address: entity.address ?? null,
            isActive: entity.isActive,
            createdAt: entity.createdAt.toISOString(),
            updatedAt: entity.updatedAt.toISOString(),
        };
    }
}
