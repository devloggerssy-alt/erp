import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import {
  getAllowedOperators,
  type FilterFieldDef,
  type FilterSchema,
} from '../api/filter-schema.js';

function buildFieldSchema(def: FilterFieldDef): object {
  const ops = getAllowedOperators(def);
  const properties: Record<string, object> = {};

  if (ops.includes('$eq')) {
    if (def.type === 'enum' && def.enumValues) {
      properties['$eq'] = { type: 'string', enum: def.enumValues };
    } else if (def.type === 'number') {
      properties['$eq'] = { type: 'number' };
    } else if (def.type === 'boolean') {
      properties['$eq'] = { type: 'boolean' };
    } else {
      properties['$eq'] = { type: 'string' };
    }
  }
  if (ops.includes('$like')) {
    properties['$like'] = { type: 'string' };
  }
  if (ops.includes('$gte')) {
    properties['$gte'] = {
      type: def.type === 'date' ? 'string' : 'number',
      ...(def.type === 'date' ? { format: 'date-time', example: '2024-01-01T00:00:00.000Z' } : { example: 10 }),
    };
  }
  if (ops.includes('$lte')) {
    properties['$lte'] = {
      type: def.type === 'date' ? 'string' : 'number',
      ...(def.type === 'date' ? { format: 'date-time', example: '2024-12-31T23:59:59.999Z' } : { example: 100 }),
    };
  }
  if (ops.includes('$in')) {
    properties['$in'] = {
      type: 'array',
      items:
        def.type === 'enum' && def.enumValues
          ? { type: 'string', enum: def.enumValues }
          : { type: 'string' },
    };
  }
  if (ops.includes('$isNull')) {
    properties['$isNull'] = { type: 'boolean', enum: [true] };
  }

  return {
    type: 'object',
    description: `Filter on \`${def.field}\` (${def.type})`,
    properties,
  };
}

/**
 * Documents the `filters` query param from a per-resource {@link FilterSchema}.
 * Apply on list handlers (or via {@link createCrudController} when `filterSchema` is set).
 */
export function ApiFilterQuery(schema: FilterSchema): MethodDecorator {
  const properties: Record<string, object> = {};
  for (const def of schema) {
    properties[def.field] = buildFieldSchema(def);
  }

  return applyDecorators(
    ApiQuery({
      name: 'filters',
      required: false,
      style: 'deepObject',
      explode: true,
      description:
        'Structured filters. Use one operator per field, e.g. ' +
        'filters[name][$like]=widget&filters[price][$gte]=10&filters[status][$in][]=active',
      schema: { type: 'object', properties },
    }),
  );
}
