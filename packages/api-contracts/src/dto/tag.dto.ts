export interface CreateTagDto {
    name: string;
    color?: string;
    module: string;
}

export interface UpdateTagDto {
    name?: string;
    color?: string;
    // module is intentionally immutable — a tag belongs to one module for its lifetime
}

export interface TagResponseDto {
    id: string;
    name: string;
    color: string | null;
    module: string;
    createdAt: string;
    updatedAt: string;
}
