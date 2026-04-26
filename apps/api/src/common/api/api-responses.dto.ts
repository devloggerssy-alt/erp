/**
 * Standardized API response DTO shapes for Swagger documentation.
 *
 * NOTE: These are reference types only — used for documentation purposes.
 * The actual runtime responses are built by ApiResponseBuilder.
 * The error response decorators in api-swagger.decorators.ts use inline
 * schema examples to avoid Swagger circular-dependency issues with
 * `data: null`.
 */

// ─── Pagination meta (can be safely referenced by Swagger) ─────────────────
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationMetaDto {
    @ApiProperty({ example: 50 })
    total: number;

    @ApiProperty({ example: 1 })
    page: number;

    @ApiProperty({ example: 10 })
    limit: number;

    @ApiPropertyOptional({ example: 5 })
    totalPages?: number;
}

export class ApiMetaDto {
    @ApiPropertyOptional({ type: () => PaginationMetaDto })
    pagination?: PaginationMetaDto;
}

export class ApiSuccessResponseDto {
    @ApiProperty({ example: 'success' })
    status: 'success';

    @ApiProperty({ example: 'Operation successful' })
    message: string;

    @ApiPropertyOptional({ type: () => ApiMetaDto })
    meta?: ApiMetaDto;
}
