/**
 * Standardized API response DTO shapes for Swagger documentation.
 *
 * NOTE: These are reference types only — used for documentation purposes.
 * The actual runtime responses are built by ApiResponseBuilder.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ example: 50 })
  total: number = 0;

  @ApiProperty({ example: 1 })
  page: number = 0;

  @ApiProperty({ example: 10 })
  limit: number = 0;

  @ApiPropertyOptional({ example: 5 })
  totalPages?: number;
}

export class ApiMetaDto {
  @ApiPropertyOptional({ type: () => PaginationMetaDto })
  pagination?: PaginationMetaDto;
}

export class ApiSuccessResponseDto {
  @ApiProperty({ example: 'success' })
  status: 'success' = 'success';

  @ApiProperty({ example: 'Operation successful' })
  message: string = '';

  @ApiPropertyOptional({ type: () => ApiMetaDto })
  meta?: ApiMetaDto;
}
