import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ── Create DTO ────────────────────────────────────────────────────────────────

export class CreateUnitDto {
  @ApiProperty({ example: 'Kilogram', description: 'Unit display name' })
  @IsString()
  @IsNotEmpty()
  name: string = '';

  @ApiProperty({ example: 'kg', description: 'Short abbreviation used on documents' })
  @IsString()
  @IsNotEmpty()
  abbreviation: string = '';
}

// ── Update DTO ────────────────────────────────────────────────────────────────

export class UpdateUnitDto {
  @ApiPropertyOptional({ example: 'Kilogram (Updated)', description: 'Updated display name' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: 'kg', description: 'Updated abbreviation' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  abbreviation?: string;

  @ApiPropertyOptional({ example: true, description: 'Whether the unit is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ── Response DTO ──────────────────────────────────────────────────────────────

export class UnitResponseDto {
  @ApiProperty({ example: '018e1234-abcd-7000-a001-000000000001' })
  id: string = '';

  @ApiProperty({ example: 'Kilogram' })
  name: string = '';

  @ApiProperty({ example: 'kg' })
  abbreviation: string = '';

  @ApiProperty({ example: true })
  isActive: boolean = true;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: string = '';

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt: string = '';
}
