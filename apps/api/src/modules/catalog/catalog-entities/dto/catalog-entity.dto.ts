import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Local type used in response DTO and presenter
export class CatalogEntityParentSummaryDto {
  @ApiProperty()
  id: string = '';

  @ApiProperty()
  name: string = '';

  @ApiProperty()
  kind: string = '';
}

export type CatalogEntityParentSummary = CatalogEntityParentSummaryDto;

// ── Create DTO ────────────────────────────────────────────────────────────────

export class CreateCatalogEntityDto {
  @ApiProperty({ example: 'Hyundai' })
  @IsString()
  @IsNotEmpty()
  name: string = '';

  @ApiProperty({
    example: 'brand',
    description: 'Entity kind (brand | model | generation | variant | year)',
  })
  @IsString()
  @IsNotEmpty()
  kind: string = '';

  @ApiPropertyOptional({ type: 'string', example: null, nullable: true })
  @IsOptional()
  @IsString()
  parentId?: string | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, nullable: true })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown> | null;
}

// ── Update DTO ────────────────────────────────────────────────────────────────

export class UpdateCatalogEntityDto {
  @ApiPropertyOptional({ example: 'Hyundai Updated' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: 'brand' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  kind?: string;

  @ApiPropertyOptional({ type: 'string', nullable: true })
  @IsOptional()
  @IsString()
  parentId?: string | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, nullable: true })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown> | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ── Response DTO ──────────────────────────────────────────────────────────────

export class CatalogEntityResponseDto {
  @ApiProperty()
  id: string = '';

  @ApiProperty()
  name: string = '';

  @ApiProperty()
  kind: string = '';

  @ApiProperty({ type: 'string', nullable: true })
  parentId: string | null = null;

  @ApiProperty({ nullable: true, type: () => CatalogEntityParentSummaryDto })
  parent: CatalogEntityParentSummary | null = null;

  @ApiProperty({ nullable: true, type: 'object', additionalProperties: true })
  attributes: Record<string, unknown> | null = null;

  @ApiProperty()
  isActive: boolean = true;

  @ApiProperty()
  createdAt: string = '';

  @ApiProperty()
  updatedAt: string = '';
}
