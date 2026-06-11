export interface CreateTagDto {
    name: string;
    color?: string;
    module: string;
}

export interface UpdateTagDto {
    name?: string;
    color?: string;
}

export interface TagResponseDto {
    id: string;
    name: string;
    color: string | null;
    module: string;
    createdAt: string;
    updatedAt: string;
}
