export interface CreateWarehouseDto {
    code: string;
    name: string;
    address?: string;
}

export interface UpdateWarehouseDto {
    code?: string;
    name?: string;
    address?: string | null;
    isActive?: boolean;
}
