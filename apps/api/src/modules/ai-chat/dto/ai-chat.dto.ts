import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSessionDto {
    @ApiPropertyOptional({ example: 'Monthly sales analysis', description: 'Optional session title' })
    @IsOptional() @IsString() title?: string;
}

export class SendMessageDto {
    @ApiProperty({ example: 'What were the top 5 selling items last month?', description: 'User message to the AI assistant' })
    @IsString() @IsNotEmpty() message: string;
}
