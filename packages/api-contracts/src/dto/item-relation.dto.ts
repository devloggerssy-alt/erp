export interface CreateItemRelationDto {
    itemId: string;
    relatedItemId: string;
    relationType: string;
    notes?: string;
}

export interface UpdateItemRelationDto {
    relationType?: string;
    notes?: string;
}

export interface ItemRelationResponseDto {
    id: string;
    itemId: string;
    relatedItemId: string;
    relationType: string;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}
