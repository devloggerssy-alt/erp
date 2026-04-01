export type ApiBaseResponse<T> = {
    data: T;
    meta: {
        current_page: number,
        last_page: number,
        per_page: number,
        total: number,
        from: number,
        to: number
    }
}

export type ApiListQueryParams = {
    page?: number;
    per_page?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    [key: string]: any; // For additional filters
}