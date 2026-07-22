import { IsString, IsNotEmpty, IsOptional, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocalizedStringDto } from '@devloggers/backend-core';

// ── Create DTO ────────────────────────────────────────────────────────────────

export class CreateUnitDto {
  @ApiProperty({ type: LocalizedStringDto, description: 'Unit display name' })
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  name: LocalizedStringDto = new LocalizedStringDto();

  @ApiProperty({ example: 'kg', description: 'Short abbreviation used on documents' })
  @IsString()
  @IsNotEmpty()
  abbreviation: string = '';
}

// ── Update DTO ────────────────────────────────────────────────────────────────

export class UpdateUnitDto {
  @ApiPropertyOptional({ type: LocalizedStringDto, description: 'Updated display name' })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  name?: LocalizedStringDto;

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

  @ApiProperty({ type: LocalizedStringDto })
  nameI18n: LocalizedStringDto = new LocalizedStringDto();

  @ApiProperty({ example: 'kg' })
  abbreviation: string = '';

  @ApiProperty({ example: true })
  isActive: boolean = true;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: string = '';

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt: string = '';
}
