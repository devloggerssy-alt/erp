/**
 * Standardized API response DTO shapes for Swagger documentation.
 *
 * NOTE: These are reference types only — used for documentation purposes.
 * The actual runtime responses are built by ApiResponseBuilder.
 */
import { resources } from '@devloggers/api-contracts';
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

export class ListFilterFieldDto {
  @ApiProperty({ example: 'name' })
  field: string = '';

  @ApiProperty({ example: 'string', enum: ['string', 'number', 'boolean', 'date', 'enum', 'id'] })
  type: string = 'string';

  @ApiProperty({
    example: ['$eq', '$like', '$in', '$isNull'],
    enum: ['$eq', '$like', '$gte', '$lte', '$in', '$isNull'],
    isArray: true,
  })
  operators: string[] = [];

  @ApiPropertyOptional({ example: ['active', 'draft'], type: [String] })
  enumValues?: string[];

  @ApiPropertyOptional({ example: Object.values(resources).map(v=>v.key).join('|'),  })
  foreignResourceKey?: string;
}

export class ApiMetaDto {
  @ApiPropertyOptional({ type: () => PaginationMetaDto })
  pagination?: PaginationMetaDto;

  @ApiPropertyOptional({
    type: () => ListFilterFieldDto,
    isArray: true,
    description: 'Filterable fields and allowed operators for this list resource',
  })
  filterOptions?: ListFilterFieldDto[];
}

export class ApiSuccessResponseDto {
  @ApiProperty({ example: 'success' })
  status: 'success' = 'success';

  @ApiProperty({ example: 'Operation successful' })
  message: string = '';

  @ApiPropertyOptional({ type: () => ApiMetaDto })
  meta?: ApiMetaDto;
}
