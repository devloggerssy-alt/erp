export interface ApiMeta {
    pagination?: Pagination;
    cursor?: Cursor;
}

export interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface Cursor {
    next?: string;
    previous?: string;
}