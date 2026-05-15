import { ApiMeta, ApiResponse } from './api-response.js';
import { ApiQueryOptionsDto } from './api-query-options.dto.js';

export class ApiResponseBuilder {
  static success<T>(data: T, message = 'Success', meta?: ApiMeta): ApiResponse<T> {
    return { status: 'success', message, data, meta };
  }

  static error(message: string, code = 'INTERNAL_ERROR', details?: any): ApiResponse<null> {
    return {
      status: 'error',
      message,
      data: null,
      error: { code, message, details },
    };
  }

  static buildPaginationMeta(query: ApiQueryOptionsDto | undefined, total: number): ApiMeta {
    const page = query?.page && query.page > 0 ? query.page : 1;
    const limit = query?.limit && query.limit > 0 ? query.limit : 10;

    return {
      pagination: { total, page, limit },
    };
  }
}
