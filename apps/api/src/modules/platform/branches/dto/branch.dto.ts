import {
    ArrayMinSize,
    ArrayUnique,
    IsArray,
    IsBoolean,
    IsEmail,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocalizedStringDto } from '@devloggers/backend-core';

// ── Create DTO ────────────────────────────────────────────────────────────────

export class CreateBranchDto {
    @ApiPropertyOptional({
        type: 'string',
        example: 'MAIN',
        description: 'Unique branch code within the tenant; auto-generated (BR-0001) when omitted',
    })
    @IsOptional()
    @IsString()
    code?: string;

    @ApiProperty({ type: LocalizedStringDto, description: 'Branch display name' })
    @ValidateNested()
    @Type(() => LocalizedStringDto)
    name: LocalizedStringDto = new LocalizedStringDto();

    @ApiPropertyOptional({ type: 'string', nullable: true, example: 'Damascus, Syria' })
    @IsOptional()
    @IsString()
    address?: string | null;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: '+963-11-1234567' })
    @IsOptional()
    @IsString()
    phone?: string | null;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: 'main@acme.com' })
    @IsOptional()
    @IsEmail()
    email?: string | null;

    @ApiPropertyOptional({
        type: [String],
        example: ['00000000-0000-4000-c100-000000000001'],
        description: 'Warehouses to link to this branch. A branch may have zero warehouses.',
    })
    @IsOptional()
    @IsArray()
    @ArrayUnique()
    @IsString({ each: true })
    warehouseIds?: string[];
}

// ── Update DTO ────────────────────────────────────────────────────────────────

export class UpdateBranchDto {
    @ApiPropertyOptional({ type: LocalizedStringDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => LocalizedStringDto)
    name?: LocalizedStringDto;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: 'Damascus, Syria' })
    @IsOptional()
    @IsString()
    address?: string | null;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: '+963-11-1234567' })
    @IsOptional()
    @IsString()
    phone?: string | null;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: 'main@acme.com' })
    @IsOptional()
    @IsEmail()
    email?: string | null;

    @ApiPropertyOptional({ type: 'boolean', example: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({
        type: [String],
        example: ['00000000-0000-4000-c100-000000000001'],
        description:
            'Replaces the branch\'s linked warehouses when provided. Removing a warehouse\'s last branch is refused.',
    })
    @IsOptional()
    @IsArray()
    @ArrayMinSize(1)
    @ArrayUnique()
    @IsString({ each: true })
    warehouseIds?: string[];
}

// ── Response DTOs ─────────────────────────────────────────────────────────────

export class BranchWarehouseRefDto {
    @ApiProperty({ example: '00000000-0000-4000-c100-000000000001' })
    id: string = '';

    @ApiProperty({ example: 'WH-MAIN' })
    code: string = '';

    @ApiProperty({ example: 'Main Warehouse' })
    name: string = '';
}

export class BranchResponseDto {
    @ApiProperty({ example: '00000000-0000-4000-e100-000000000001' })
    id: string = '';

    @ApiProperty({ example: 'MAIN' })
    code: string = '';

    @ApiProperty({ example: 'Main Branch' })
    name: string = '';

    @ApiProperty({ type: LocalizedStringDto })
    nameI18n: LocalizedStringDto = new LocalizedStringDto();

    @ApiProperty({ type: 'string', example: 'Damascus, Syria', nullable: true })
    address: string | null = null;

    @ApiProperty({ type: 'string', example: '+963-11-1234567', nullable: true })
    phone: string | null = null;

    @ApiProperty({ type: 'string', example: 'main@acme.com', nullable: true })
    email: string | null = null;

    @ApiProperty({ example: true })
    isActive: boolean = true;

    @ApiProperty({ type: () => BranchWarehouseRefDto, isArray: true })
    warehouses: BranchWarehouseRefDto[] = [];

    @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
    createdAt: string = '';

    @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
    updatedAt: string = '';
}
