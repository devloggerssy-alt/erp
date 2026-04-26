import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateItemCategoryDto {
    @ApiProperty({ example: 'Electronics', description: 'Category display name' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({ example: 'Electronic devices and accessories' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ example: '00000000-0000-4000-a700-000000000001', description: 'Parent category ID for nesting' })
    @IsOptional()
    @IsString()
    parentId?: string;
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
