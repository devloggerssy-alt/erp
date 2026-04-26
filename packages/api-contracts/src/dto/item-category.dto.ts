export interface CreateItemCategoryDto {
    name: string;
    description?: string;
    parentId?: string | null;
}

export interface UpdateItemCategoryDto {
    name?: string;
    description?: string | null;
    parentId?: string | null;
    isActive?: boolean;
}
