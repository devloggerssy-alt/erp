import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class AiListQueryDto {
  @ApiPropertyOptional({ type: 'string', description: 'Free-text search keyword' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ type: 'integer', minimum: 1, description: 'Page number, starting at 1' })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ type: 'integer', minimum: 1, maximum: 50, description: 'Rows per page (max 50, default 20)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class AiIdDto {
  @ApiProperty({ type: 'string', format: 'uuid', description: 'Record UUID' })
  @IsUUID()
  id!: string;
}
