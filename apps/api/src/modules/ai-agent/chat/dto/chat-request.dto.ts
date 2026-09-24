import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export class ChatUserMessageDto {
    @ApiProperty({ type: 'string', description: 'Client-generated message id (AI SDK)' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    id!: string;

    @ApiProperty({ type: 'string', example: 'List my units' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(8000)
    text!: string;
}

export class ApprovalDecisionDto {
    @ApiProperty({ type: 'string' })
    @IsString()
    @IsNotEmpty()
    toolCallId!: string;

    @ApiProperty({ type: 'boolean' })
    @IsBoolean()
    approved!: boolean;

    @ApiPropertyOptional({ type: 'string' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    reason?: string;
}

/** Exactly one of `message` / `approvals` (checked in ChatService). */
export class ChatRequestDto {
    @ApiPropertyOptional({ type: () => ChatUserMessageDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => ChatUserMessageDto)
    message?: ChatUserMessageDto;

    @ApiPropertyOptional({ type: () => ApprovalDecisionDto, isArray: true })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(20)
    @ValidateNested({ each: true })
    @Type(() => ApprovalDecisionDto)
    approvals?: ApprovalDecisionDto[];
}
