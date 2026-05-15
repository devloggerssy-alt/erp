import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWarehouseDto {
    @ApiProperty({ example: 'WH-MAIN', description: 'Unique warehouse code' })
    @IsString()
    @IsNotEmpty()
    code: string = '';

    @ApiProperty({ example: 'Main Warehouse', description: 'Warehouse display name' })
    @IsString()
    @IsNotEmpty()
    name: string = '';

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

export class WarehouseResponseDto {
    @ApiProperty({ example: '00000000-0000-4000-c100-000000000001' })
    id: string = '';

    @ApiProperty({ example: 'WH-MAIN' })
    code: string = '';

    @ApiProperty({ example: 'Main Warehouse' })
    name: string = '';

    @ApiProperty({ example: 'Damascus Industrial Zone', nullable: true })
    address: string | null = null;

    @ApiProperty({ example: true })
    isActive: boolean = true;

    @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
    createdAt: string = '';

    @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
    updatedAt: string = '';
}
