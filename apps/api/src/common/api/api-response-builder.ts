import { ApiMeta, ApiResponse } from './api-response';
import { ApiQueryOptionsDto } from './api-query-options.dto';

export class ApiResponseBuilder {
    static success<T>(
        data: T,
        message = 'Success',
        meta?: ApiMeta,
    ): ApiResponse<T> {
        return { message, data, meta };
    }

    static error(
        message: string,
        code = 'INTERNAL_ERROR',
        details?: any,
    ): ApiResponse<null> {
        return {
            message,
            data: null,
            error: { code, message, details },
        };
    }

    static buildPaginationMeta(
        query: ApiQueryOptionsDto | undefined,
        total: number,
    ): ApiMeta {
        const page =
            query?.pagination?.page && query.pagination.page > 0
                ? query.pagination.page
                : 1;
        const limit =
            query?.pagination?.limit && query.pagination.limit > 0
                ? query.pagination.limit
                : 10;

        return {
            pagination: {
                total,
                page,
                limit,
            },
        };
    }
}


