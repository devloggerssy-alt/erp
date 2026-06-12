export type RelationType = 'compatible_with' | 'replaces' | 'requires'

export interface CreateItemRelationDto {
    itemId: string;
    relatedItemId: string;
    relationType: RelationType;
    notes?: string;
}

export interface UpdateItemRelationDto {
    relationType?: RelationType;
    notes?: string;
}

export interface ItemRelationResponseDto {
    id: string;
    itemId: string;
    relatedItemId: string;
    relationType: RelationType;
    notes: string | null;
    relatedItem: { id: string; name: string; code: string };
    createdAt: string;
    updatedAt: string;
}
