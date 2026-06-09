import { ConflictException, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrudService } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { CustomField } from '@devloggers/db-prisma';
import { CustomFieldsRepository } from '../repositories/custom-fields.repository';
import { CustomFieldPresenter } from '../presenters/custom-field.presenter';
import { CreateCustomFieldDto, UpdateCustomFieldDto, CustomFieldResponseDto } from '../dto';

@Injectable()
export class CustomFieldsService extends CrudService<
    CustomField,
    CustomFieldResponseDto,
    CreateCustomFieldDto,
    UpdateCustomFieldDto
> {
    protected readonly resourceName = resources.customFields.key;

    constructor(
        private readonly customFieldsRepository: CustomFieldsRepository,
        private readonly customFieldPresenter: CustomFieldPresenter,
        private readonly emitter: EventEmitter2,
    ) {
        super(customFieldsRepository, customFieldPresenter, emitter);
    }

    async listByModule(tenantId: string, module: string): Promise<CustomFieldResponseDto[]> {
        const rows = await this.customFieldsRepository.findByModule(tenantId, module);
        return this.customFieldPresenter.toResponseList(rows);
    }

    protected override async beforeCreate(tenantId: string, dto: CreateCustomFieldDto): Promise<void> {
        const taken = await this.customFieldsRepository.isNameTaken(
            tenantId,
            dto.module,
            dto.name.ar,
        );
        if (taken) {
            throw new ConflictException(`A custom field named "${dto.name.ar}" already exists for this module`);
        }
    }

    protected override async beforeUpdate(
        tenantId: string,
        id: string,
        dto: UpdateCustomFieldDto,
    ): Promise<void> {
        if (dto.name?.ar) {
            const existing = await this.customFieldsRepository.findByIdOrFail(tenantId, id, 'Custom field');
            const taken = await this.customFieldsRepository.isNameTaken(
                tenantId,
                existing.module,
                dto.name.ar,
                id,
            );
            if (taken) {
                throw new ConflictException(`A custom field named "${dto.name.ar}" already exists for this module`);
            }
        }
    }
}
