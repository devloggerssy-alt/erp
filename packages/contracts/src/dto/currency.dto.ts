export interface CreateCurrencyDto {
    code: string;
    name: string;
    symbol?: string;
    isBase?: boolean;
}

export interface UpdateCurrencyDto {
    name?: string;
    symbol?: string;
    isBase?: boolean;
    isActive?: boolean;
}
