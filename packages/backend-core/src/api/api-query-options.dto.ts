import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export type SortOrder = 'asc' | 'desc';

/**
 * Standard flat query parameters for list endpoints.
 *
 * Usage: GET /units?page=1&limit=10&sortField=name&sortOrder=asc&search=kg&searchIn=name,symbol
 */
export class ApiQueryOptionsDto {
  @ApiPropertyOptional({ example: 1, default: 1, description: 'Page number (1-based)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10, description: 'Number of items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ example: 'createdAt', description: 'Field name to sort by' })
  @IsOptional()
  @IsString()
  sortField?: string;

  @ApiPropertyOptional({ example: 'asc', enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: SortOrder;

  @ApiPropertyOptional({ example: 'kilogram', description: 'Full-text search keyword' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 'name,symbol',
    description: 'Comma-separated field names to search within (e.g. name,symbol)',
  })
  @IsOptional()
  @IsString()
  searchIn?: string;
}
