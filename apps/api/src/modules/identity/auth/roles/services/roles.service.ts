import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
    CrudService,
    ResourceCreatedEvent,
    ResourceUpdatedEvent,
    type LocalizedStringDto,
} from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { Prisma, Role } from '@devloggers/db-prisma';
import { RolesRepository } from '../repositories/roles.repository';
import { RolePresenter } from '../presenters/role.presenter';
import { CreateRoleDto, UpdateRoleDto, RoleResponseDto } from '../dto';
import { PermissionResolverService } from '../../permissions/permission-resolver.service';

/**
 * Prisma JSON columns require an index signature; `LocalizedStringDto` is an
 * interface, so it is copied into a JSON-compatible object. `null`/`undefined`
 * pass through untouched so the previous create/update semantics are preserved.
 */
const toJson = (value: LocalizedStringDto): Prisma.InputJsonValue => ({ ...value });
const toOptionalJson = (value: LocalizedStringDto | undefined) =>
    value == null ? value : { ...value };

@Injectable()
export class RolesService extends CrudService<Role, RoleResponseDto, CreateRoleDto, UpdateRoleDto> {
    protected readonly resourceName = resources.roles.key;

    constructor(
        private readonly rolesRepository: RolesRepository,
        private readonly rolePresenter: RolePresenter,
        private readonly emitter: EventEmitter2,
        private readonly permissions: PermissionResolverService,
    ) {
        super(rolesRepository, rolePresenter, emitter);
    }

    override async create(tenantId: string, dto: CreateRoleDto): Promise<RoleResponseDto> {
        const { permissionKeys = [], ...data } = dto;
        await this.beforeCreate(tenantId, data as CreateRoleDto);

        const role = await this.rolesRepository.create({
            tenantId,
            name: toJson(data.name),
            description: toOptionalJson(data.description),
        });
        await this.rolesRepository.replacePermissions(role.id, permissionKeys);
        this.permissions.invalidateTenant(tenantId);

        this.emitter.emit(
            ResourceCreatedEvent.eventName(this.resourceName),
            new ResourceCreatedEvent(tenantId, this.resourceName, role),
        );
        return this.findById(tenantId, role.id);
    }

    override async update(tenantId: string, id: string, dto: UpdateRoleDto): Promise<RoleResponseDto> {
        const existing = await this.rolesRepository.findByIdOrFail(tenantId, id, this.resourceName);
        if (existing.isSystem) {
            throw new ForbiddenException('System roles cannot be modified');
        }

        const { permissionKeys, ...data } = dto;
        await this.beforeUpdate(tenantId, id, data as UpdateRoleDto, existing);

        const updated = await this.rolesRepository.update(id, {
            ...(data.name === undefined ? {} : { name: toJson(data.name) }),
            ...(data.description === undefined ? {} : { description: toOptionalJson(data.description) }),
        });
        if (permissionKeys) {
            await this.rolesRepository.replacePermissions(id, permissionKeys);
        }
        this.permissions.invalidateTenant(tenantId);

        this.emitter.emit(
            ResourceUpdatedEvent.eventName(this.resourceName),
            new ResourceUpdatedEvent(tenantId, this.resourceName, updated, existing),
        );
        return this.findById(tenantId, id);
    }

    override async delete(tenantId: string, id: string): Promise<void> {
        const existing = await this.rolesRepository.findByIdOrFail(tenantId, id, this.resourceName);
        if (existing.isSystem) {
            throw new ForbiddenException('System roles cannot be deleted');
        }

        await super.delete(tenantId, id);
        this.permissions.invalidateTenant(tenantId);
    }

    protected override async beforeCreate(tenantId: string, dto: CreateRoleDto): Promise<void> {
        const taken = await this.rolesRepository.isNameTaken(tenantId, dto.name.ar);
        if (taken) {
            throw new ConflictException(`A role with name "${dto.name.ar}" already exists`);
        }
    }

    protected override async beforeUpdate(
        tenantId: string,
        id: string,
        dto: UpdateRoleDto,
        _existing: Role,
    ): Promise<void> {
        if (dto.name) {
            const taken = await this.rolesRepository.isNameTaken(tenantId, dto.name.ar, id);
            if (taken) {
                throw new ConflictException(`A role with name "${dto.name.ar}" already exists`);
            }
        }
    }
}
