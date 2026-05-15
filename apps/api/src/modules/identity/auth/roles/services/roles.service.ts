import { Injectable, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrudService } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { Role } from '@devloggers/db-prisma';
import { RolesRepository } from '../repositories/roles.repository';
import { RolePresenter } from '../presenters/role.presenter';
import { CreateRoleDto, UpdateRoleDto, RoleResponseDto } from '../dto';

@Injectable()
export class RolesService extends CrudService<Role, RoleResponseDto, CreateRoleDto, UpdateRoleDto> {
    protected readonly resourceName = resources.roles.key;

    constructor(
        private readonly rolesRepository: RolesRepository,
        private readonly rolePresenter: RolePresenter,
        private readonly emitter: EventEmitter2,
    ) {
        super(rolesRepository, rolePresenter, emitter);
    }

    protected override async beforeCreate(tenantId: string, dto: CreateRoleDto): Promise<void> {
        const taken = await this.rolesRepository.isNameTaken(tenantId, dto.name);
        if (taken) {
            throw new ConflictException(`A role with name "${dto.name}" already exists`);
        }
    }

    protected override async beforeUpdate(
        tenantId: string,
        id: string,
        dto: UpdateRoleDto,
    ): Promise<void> {
        if (dto.name) {
            const taken = await this.rolesRepository.isNameTaken(tenantId, dto.name, id);
            if (taken) {
                throw new ConflictException(`A role with name "${dto.name}" already exists`);
            }
        }
    }
}
