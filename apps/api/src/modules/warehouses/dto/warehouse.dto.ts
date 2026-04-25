import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWarehouseDto {
    @ApiProperty({ example: 'WH-MAIN', description: 'Unique warehouse code' })
    @IsString()
    @IsNotEmpty()
    code: string;

    @ApiProperty({ example: 'Main Warehouse', description: 'Warehouse display name' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({ example: 'Damascus Industrial Zone' })
    @IsOptional()
    @IsString()
    address?: string;
}

export class UpdateWarehouseDto {
    @ApiPropertyOptional({ example: 'WH-MAIN' })
    @IsOptional()
    @IsString()
    code?: string;

    @ApiPropertyOptional({ example: 'Main Warehouse (Renovated)' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ example: 'Damascus Industrial Zone, Building 5' })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
