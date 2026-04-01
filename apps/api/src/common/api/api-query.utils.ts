import { ApiQueryOptionsDto } from './api-query-options.dto';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export const resolvePagination = (
  query?: ApiQueryOptionsDto,
): PaginationParams => {
  const page =
    query?.pagination?.page && query.pagination.page > 0
      ? query.pagination.page
      : 1;
  const limit =
    query?.pagination?.limit && query.pagination.limit > 0
      ? query.pagination.limit
      : 10;

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};


