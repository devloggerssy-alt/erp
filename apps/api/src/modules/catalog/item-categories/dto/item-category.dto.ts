import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateItemCategoryDto {
    @ApiProperty({ example: 'Electronics', description: 'Category display name' })
    @IsString()
    @IsNotEmpty()
    name: string = '';

    @ApiPropertyOptional({ example: 'Electronic devices and accessories' })
    @IsOptional()
    @IsString()
    description: string = '';

    @ApiPropertyOptional({ example: '00000000-0000-4000-a700-000000000001', description: 'Parent category ID for nesting' })
    @IsOptional()
    @IsString()
    parentId: string = '';

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    isActive: boolean = true;
}

export class UpdateItemCategoryDto {
    @ApiPropertyOptional({ example: 'Electronics & Accessories' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ example: 'Updated description for electronics category' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ example: '00000000-0000-4000-a700-000000000001', description: 'Parent category ID' })
    @IsOptional()
    @IsString()
    parentId?: string;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class ItemCategoryResponseDto {
    @ApiProperty({ example: '00000000-0000-4000-a700-000000000002' })
    id: string = '';

    @ApiProperty({ example: 'Electronics' })
    name: string = '';

    @ApiProperty({ example: 'Electronic devices and accessories' })
    description: string = '';

    @ApiProperty({ example: '00000000-0000-4000-a700-000000000001', nullable: true })
    parentId: string | null = null;

    @ApiPropertyOptional({ description: 'Parent category summary' })
    @Type(() => ParentCategoryDto)
    parent?: ParentCategoryDto | null;

    @ApiProperty({ example: true })
    isActive: boolean = true;

    @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
    createdAt: string = '';

    @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
    updatedAt: string = '';
}

export class ParentCategoryDto {
    @ApiProperty({ example: '00000000-0000-4000-a700-000000000001' })
    id: string = '';

    @ApiProperty({ example: 'Electronics' })
    name: string = '';
}