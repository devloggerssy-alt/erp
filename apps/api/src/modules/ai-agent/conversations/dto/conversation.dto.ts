import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export enum AiMessageRoleEnum {
    USER = 'USER',
    ASSISTANT = 'ASSISTANT',
    SYSTEM = 'SYSTEM',
}

export class CreateConversationDto {
    @ApiPropertyOptional({ type: 'string', example: 'Stock cleanup', description: 'Optional title; defaults to the first message' })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    title?: string;
}

export class UpdateConversationDto {
    @ApiProperty({ type: 'string', example: 'Stock cleanup' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    title!: string;
}

export class CursorPageQueryDto {
    @ApiPropertyOptional({ type: 'string', description: 'Id of the last row of the previous page' })
    @IsOptional()
    @IsString()
    cursor?: string;

    @ApiPropertyOptional({ type: 'integer', minimum: 1, maximum: 50, default: 20 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(50)
    limit?: number;
}

export class ConversationResponseDto {
    @ApiProperty({ type: 'string', example: '018e1234-abcd-7000-a001-000000000001' })
    id: string = '';

    @ApiProperty({ type: 'string', nullable: true, example: 'Stock cleanup' })
    title: string | null = null;

    @ApiProperty({ type: 'string', example: '2026-09-24T10:00:00.000Z' })
    lastMessageAt: string = '';

    @ApiProperty({ type: 'string', example: '2026-09-24T10:00:00.000Z' })
    createdAt: string = '';
}

export class ConversationPageDto {
    @ApiProperty({ type: () => ConversationResponseDto, isArray: true })
    items: ConversationResponseDto[] = [];

    @ApiProperty({ type: 'string', nullable: true })
    nextCursor: string | null = null;
}

export class AiMessageResponseDto {
    @ApiProperty({ type: 'string' })
    id: string = '';

    @ApiProperty({ enum: AiMessageRoleEnum, enumName: 'AiMessageRoleEnum' })
    role: AiMessageRoleEnum = AiMessageRoleEnum.USER;

    @ApiProperty({
        type: 'array',
        items: { type: 'object', additionalProperties: true },
        description: 'AI SDK UIMessage parts, verbatim',
    })
    parts: Record<string, unknown>[] = [];

    @ApiProperty({ type: 'object', additionalProperties: true, nullable: true })
    metadata: Record<string, unknown> | null = null;

    @ApiProperty({ type: 'string', example: '2026-09-24T10:00:00.000Z' })
    createdAt: string = '';
}

export class AiMessagePageDto {
    @ApiProperty({ type: () => AiMessageResponseDto, isArray: true, description: 'Newest first' })
    items: AiMessageResponseDto[] = [];

    @ApiProperty({ type: 'string', nullable: true })
    nextCursor: string | null = null;
}

export class AiModelResponseDto {
    @ApiProperty({ type: 'string', example: 'openai' })
    provider: string = '';

    @ApiProperty({ type: 'string', nullable: true, example: null })
    model: string | null = null;
}
