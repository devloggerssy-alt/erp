import type { ApiQueryOptionsDto } from './api-query-options.dto.js';
import {
  conditionUsesOperator,
  getAllowedOperators,
  isOperatorAllowedForField,
  type FilterCondition,
  type FilterFieldType,
  type FilterSchema,
} from './filter-schema.js';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

function coerce(value: unknown, type: FilterFieldType): unknown {
  if (type === 'number') return Number(value);
  if (type === 'date') return new Date(value as string | number);
  if (type === 'boolean') return value === 'true' || value === true;
  return value;
}

function conditionToPrisma(
  condition: FilterCondition,
  fieldType: FilterFieldType,
): Record<string, unknown> {
  if ('$eq' in condition) return { equals: coerce(condition.$eq, fieldType) };
  if ('$like' in condition) return { contains: condition.$like, mode: 'insensitive' };
  if ('$gte' in condition) return { gte: coerce(condition.$gte, fieldType) };
  if ('$lte' in condition) return { lte: coerce(condition.$lte, fieldType) };
  if ('$in' in condition) {
    return { in: condition.$in.map((v) => coerce(v, fieldType)) };
  }
  if ('$isNull' in condition) return { equals: null };
  return {};
}

export const resolvePagination = (query?: ApiQueryOptionsDto): PaginationParams => {
  const page = query?.page && query.page > 0 ? query.page : 1;
  const limit = query?.limit && query.limit > 0 ? query.limit : 10;

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

/**
 * Converts {@link ApiQueryOptionsDto} search + filter fields into a Prisma `where` clause.
 * Filters are only applied when a {@link FilterSchema} is provided (safelist).
 */
export function buildPrismaWhere(
  query: ApiQueryOptionsDto,
  schema?: FilterSchema,
): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  if (query.search && query.searchIn) {
    const fields = query.searchIn.split(',').map((f) => f.trim());
    where['OR'] = fields.map((field) => ({
      [field]: { contains: query.search, mode: 'insensitive' },
    }));
  }

  if (query.filters && schema) {
    const schemaMap = new Map(schema.map((def) => [def.field, def]));

    for (const [field, rawCondition] of Object.entries(query.filters)) {
      const def = schemaMap.get(field);
      if (!def) continue;

      const condition = rawCondition as FilterCondition;
      if (!isOperatorAllowedForField(condition, def)) continue;

      where[field] = conditionToPrisma(condition, def.type);
    }
  }

  return where;
}

/**
 * Converts {@link ApiQueryOptionsDto} sort fields into a Prisma `orderBy` clause.
 * Defaults to `{ createdAt: 'desc' }` when no sortField is provided.
 */
export function buildPrismaOrderBy(query: ApiQueryOptionsDto): Record<string, unknown> {
  if (query.sortField) {
    return { [query.sortField]: query.sortOrder ?? 'asc' };
  }
  return { createdAt: 'desc' };
}
