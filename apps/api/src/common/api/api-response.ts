export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

export interface ApiMeta {
  pagination?: PaginationMeta;
  info?: string;
}

export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message: string;
  data: T;
  error?: ApiError;
  meta?: ApiMeta;
}


