import { Injectable } from '@nestjs/common';
import { CrudPresenter } from '@devloggers/backend-core';
import type { InvoiceType } from '@devloggers/db-prisma';
import { InvoiceTypeResponseDto } from '../dto';

@Injectable()
export class InvoiceTypePresenter extends CrudPresenter<InvoiceType, InvoiceTypeResponseDto> {
    toResponse(entity: InvoiceType): InvoiceTypeResponseDto {
        return {
            id: entity.id,
            code: entity.code,
            name: entity.name,
            direction: entity.direction,
            affectsStock: entity.affectsStock,
            isActive: entity.isActive,
            createdAt: entity.createdAt.toISOString(),
            updatedAt: entity.updatedAt.toISOString(),
        };
    }
}
