import type { ApiMeta, ListFilterField } from '@devloggers/api-contracts';
import { ApiQueryOptionsDto } from './api-query-options.dto.js';
import { ApiResponse } from './api-response.js';
import { FilterSchema, getAllowedOperators } from './filter-schema.js';

export class ApiResponseBuilder {
  static success<T>(data: T, message = 'Success', meta?: ApiMeta): ApiResponse<T> {
    return { status: 'success', message, data, meta };
  }

  static error(message: string, code = 'INTERNAL_ERROR', details?: unknown): ApiResponse<null> {
    return {
      status: 'error',
      message,
      data: null,
      error: { code, message, details },
    };
  }

  static buildListFilterOptions(schema: FilterSchema): ListFilterField[] {
    return schema.map((def) => ({
      field: def.field,
      type: def.type,
      operators: getAllowedOperators(def),
      ...(def.enumValues !== undefined ? { enumValues: def.enumValues } : {}),
      ...(def.foreignResourceKey !== undefined
        ? { foreignResourceKey: def.foreignResourceKey }
        : {}),
    }));
  }

  static buildPaginationMeta(
    query: ApiQueryOptionsDto | undefined,
    total: number,
    filterSchema?: FilterSchema,
  ): ApiMeta {
    const page = query?.page && query.page > 0 ? query.page : 1;
    const limit = query?.limit && query.limit > 0 ? query.limit : 10;

    const meta: ApiMeta = {
      pagination: {
        total,
        page,
        limit,
        totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
      },
    };

    if (filterSchema?.length) {
      meta.filterOptions = ApiResponseBuilder.buildListFilterOptions(filterSchema);
    }

    return meta;
  }
}
