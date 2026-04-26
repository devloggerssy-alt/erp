import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUnitDto {
    @ApiProperty({ example: 'Kilogram', description: 'Unit display name' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'kg', description: 'Short abbreviation' })
    @IsString()
    @IsNotEmpty()
    abbreviation: string;
}

export class UpdateUnitDto {
    @ApiPropertyOptional({ example: 'Kilogram (Updated)' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ example: 'kg' })
    @IsOptional()
    @IsString()
    abbreviation?: string;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
