import { ApiQueryOptionsDto } from './api-query-options.dto.js';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
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
 * Converts ApiQueryOptionsDto search fields into a Prisma `where` clause.
 * Uses `search` (keyword) and `searchIn` (comma-separated field names).
 */
export function buildPrismaWhere(query: ApiQueryOptionsDto): Record<string, any> {
  const where: Record<string, any> = {};

  if (query.search && query.searchIn) {
    const fields = query.searchIn
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);

    if (fields.length > 0) {
      where['OR'] = fields.map((key) => ({
        [key]: { contains: query.search, mode: 'insensitive' },
      }));
    }
  }

  return where;
}

/**
 * Converts ApiQueryOptionsDto sort fields into a Prisma `orderBy` clause.
 * Defaults to `{ createdAt: 'desc' }` when no sortField is provided.
 */
export function buildPrismaOrderBy(query: ApiQueryOptionsDto): Record<string, any> {
  if (query.sortField) {
    return { [query.sortField]: query.sortOrder ?? 'asc' };
  }
  return { createdAt: 'desc' };
}
