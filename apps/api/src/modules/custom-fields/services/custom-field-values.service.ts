import { BadRequestException, Injectable } from '@nestjs/common';
import type { CustomField } from '@devloggers/db-prisma';
import {
    type CustomFieldModule,
    type CustomFieldValuesMap,
    type FieldType,
    deserializeCustomFieldValue,
    serializeCustomFieldValue,
} from '@devloggers/api-contracts';
import { CustomFieldsRepository } from '../repositories/custom-fields.repository';
import { CustomFieldValuesRepository } from '../repositories/custom-field-values.repository';

@Injectable()
export class CustomFieldValuesService {
    constructor(
        private readonly customFieldsRepository: CustomFieldsRepository,
        private readonly customFieldValuesRepository: CustomFieldValuesRepository,
    ) {}

    async getForEntity(
        tenantId: string,
        module: CustomFieldModule,
        entityId: string,
    ): Promise<CustomFieldValuesMap> {
        const rows = await this.customFieldValuesRepository.findForEntity(tenantId, module, entityId);
        return this.rowsToMap(rows);
    }

    async getForEntities(
        tenantId: string,
        module: CustomFieldModule,
        entityIds: string[],
    ): Promise<Record<string, CustomFieldValuesMap>> {
        const rows = await this.customFieldValuesRepository.findForEntities(tenantId, module, entityIds);
        const result: Record<string, CustomFieldValuesMap> = {};

        for (const entityId of entityIds) {
            result[entityId] = {};
        }

        for (const row of rows) {
            const map = result[row.entityId] ?? {};
            map[row.fieldId] = deserializeCustomFieldValue(
                row.field.type as FieldType,
                row.value,
            );
            result[row.entityId] = map;
        }

        return result;
    }

    async clearForEntity(
        tenantId: string,
        module: CustomFieldModule,
        entityId: string,
    ): Promise<void> {
        await this.customFieldValuesRepository.deleteForEntity(tenantId, module, entityId);
    }

    async sync(
        tenantId: string,
        module: CustomFieldModule,
        entityId: string,
        values?: CustomFieldValuesMap,
    ): Promise<void> {
        if (!values) return;

        const definitions = await this.customFieldsRepository.findByModule(tenantId, module);
        const definitionById = new Map(definitions.map((field) => [field.id, field]));

        const rows: Array<{ fieldId: string; value: string }> = [];

        for (const [fieldId, rawValue] of Object.entries(values)) {
            const definition = definitionById.get(fieldId);
            if (!definition) {
                throw new BadRequestException(`Unknown custom field: ${fieldId}`);
            }

            this.validateValue(definition, rawValue);

            rows.push({
                fieldId,
                value: serializeCustomFieldValue(definition.type as FieldType, rawValue),
            });
        }

        const requiredMissing = definitions.filter(
            (field) => field.isRequired && !(field.id in values),
        );
        if (requiredMissing.length > 0) {
            throw new BadRequestException('Required custom fields are missing');
        }

        await this.customFieldValuesRepository.deleteForEntity(tenantId, module, entityId);

        const nonEmptyRows = rows.filter((row) => row.value !== '');
        if (nonEmptyRows.length > 0) {
            await this.customFieldValuesRepository.upsertMany(
                tenantId,
                module,
                entityId,
                nonEmptyRows,
            );
        }
    }

    private rowsToMap(
        rows: Array<{ fieldId: string; value: string; field: CustomField }>,
    ): CustomFieldValuesMap {
        const map: CustomFieldValuesMap = {};
        for (const row of rows) {
            map[row.fieldId] = deserializeCustomFieldValue(
                row.field.type as FieldType,
                row.value,
            );
        }
        return map;
    }

    private validateValue(field: CustomField, value: unknown): void {
        if (value === null || value === undefined || value === '') {
            if (field.isRequired) {
                throw new BadRequestException(`Custom field "${field.id}" is required`);
            }
            return;
        }

        switch (field.type) {
            case 'NUMBER':
                if (typeof value !== 'number' && Number.isNaN(Number(value))) {
                    throw new BadRequestException(`Custom field "${field.id}" must be a number`);
                }
                break;
            case 'BOOLEAN':
                if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
                    throw new BadRequestException(`Custom field "${field.id}" must be a boolean`);
                }
                break;
            case 'SELECT':
                if (!field.options.includes(String(value))) {
                    throw new BadRequestException(`Invalid option for custom field "${field.id}"`);
                }
                break;
            case 'MULTI_SELECT': {
                const items = Array.isArray(value) ? value.map(String) : [String(value)];
                const invalid = items.filter((item) => !field.options.includes(item));
                if (invalid.length > 0) {
                    throw new BadRequestException(`Invalid options for custom field "${field.id}"`);
                }
                break;
            }
            default:
                break;
        }
    }
}
