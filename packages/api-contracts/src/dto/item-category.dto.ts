export interface CreateItemCategoryDto {
    name: string;
    description?: string;
    imageUrl?: string | null;
    parentId?: string | null;
}

export interface UpdateItemCategoryDto {
    name?: string;
    description?: string | null;
    imageUrl?: string | null;
    parentId?: string | null;
    isActive?: boolean;
}

export interface ItemCategoryResponseDto {
    id: string;
    name: string;
    description: string;
    imageUrl: string | null;
    parentId: string | null;
    parent?: { id: string; name: string } | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
