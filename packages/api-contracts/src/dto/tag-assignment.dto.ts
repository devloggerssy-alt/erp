import type { TagResponseDto } from './tag.dto';

export interface CreateTagAssignmentDto {
    tagId: string;
    entityType: string;
    entityId: string;
}

export interface TagAssignmentResponseDto {
    id: string;
    tagId: string;
    entityType: string;
    entityId: string;
    tag: TagResponseDto;
    createdAt: string;
}
