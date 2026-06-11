import { IsString, IsNotEmpty, IsOptional, IsIn, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ── Create DTO ────────────────────────────────────────────────────────────────

export class CreateTagDto {
  @ApiProperty({ example: 'Fragile', description: 'Tag display name' })
  @IsString()
  @IsNotEmpty()
  name: string = '';

  @ApiPropertyOptional({ example: '#FF5733', description: 'Hex color code' })
  @IsOptional()
  @IsString()
  @Matches(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, { message: 'color must be a valid hex color (e.g. #RGB or #RRGGBB)' })
  color?: string;

  @ApiProperty({
    example: 'items',
    description: 'Module this tag belongs to',
    enum: ['items', 'parties', 'invoices', 'warehouses'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['items', 'parties', 'invoices', 'warehouses'])
  module: string = '';
}

// ── Update DTO ────────────────────────────────────────────────────────────────

export class UpdateTagDto {
  @ApiPropertyOptional({ example: 'Fragile (Updated)' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: '#3498DB' })
  @IsOptional()
  @IsString()
  @Matches(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, { message: 'color must be a valid hex color (e.g. #RGB or #RRGGBB)' })
  color?: string;
  // module is intentionally immutable once a tag is created
}

// ── Response DTO ──────────────────────────────────────────────────────────────

export class TagResponseDto {
  @ApiProperty({ example: '018e1234-abcd-7000-a001-000000000001' })
  id: string = '';

  @ApiProperty({ example: 'Fragile' })
  name: string = '';

  @ApiProperty({ example: '#FF5733', nullable: true })
  color: string | null = null;

  @ApiProperty({ example: 'items', enum: ['items', 'parties', 'invoices', 'warehouses'] })
  module: string = '';

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: string = '';

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt: string = '';
}
