import { Injectable } from '@nestjs/common';
import { CrudPresenter } from '@devloggers/backend-core';
import type { Party } from '@devloggers/db-prisma';
import { PartyResponseDto } from '../dto';

@Injectable()
export class PartyPresenter extends CrudPresenter<Party, PartyResponseDto> {
    toResponse(entity: Party): PartyResponseDto {
        return {
            id: entity.id,
            code: entity.code ?? null,
            name: entity.name,
            type: entity.type,
            phone: entity.phone ?? null,
            email: entity.email ?? null,
            address: entity.address ?? null,
            openingBalance: entity.openingBalance ?? 0,
            isActive: entity.isActive,
            createdAt: entity.createdAt.toISOString(),
            updatedAt: entity.updatedAt.toISOString(),
        };
    }
}
