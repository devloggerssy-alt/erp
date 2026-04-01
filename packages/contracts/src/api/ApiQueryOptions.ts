export type SortOrder = 'asc' | 'desc';

export interface PaginationOptions {
    page?: number;
    limit?: number;
}

export interface SortOptions<TFields extends string = string> {
    field?: TFields;
    order?: SortOrder;
}

export type FilterOptions<TFields extends string = string> = Partial<
    Record<TFields, any>
>;

export interface IncludeOptions {
    [relation: string]: boolean;
}

export type SearchOptions<TFields extends string = string> = { value: string, keys: TFields[] }

export interface ApiQueryOptions<TFields extends string = string> {
    pagination?: PaginationOptions;
    sort?: SortOptions<TFields>;
    filters?: FilterOptions;
    include?: IncludeOptions;
    search?: SearchOptions;
}