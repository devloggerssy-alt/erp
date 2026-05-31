export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

import type { ApiMeta, Cursor, Pagination } from '@devloggers/api-contracts';

export type { ApiMeta, Cursor, Pagination as PaginationMeta };

export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  message: string;
  data: T;
  error?: ApiError;
  meta?: ApiMeta;
}
