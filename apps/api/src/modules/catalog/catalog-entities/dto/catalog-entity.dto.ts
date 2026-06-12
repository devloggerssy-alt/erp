import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Local type used in response DTO and presenter
export type CatalogEntityParentSummary = {
  id: string;
  name: string;
  kind: string;
};

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

  @ApiPropertyOptional({ example: null, nullable: true })
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

  @ApiPropertyOptional({ nullable: true })
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

  @ApiProperty({ nullable: true })
  parentId: string | null = null;

  @ApiProperty({ nullable: true, type: () => Object })
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
