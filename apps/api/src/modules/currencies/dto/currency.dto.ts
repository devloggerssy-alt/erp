import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCurrencyDto {
    @ApiProperty({ example: 'SYP' })
    @IsString()
    @IsNotEmpty()
    code: string;

    @ApiProperty({ example: 'Syrian Pound' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({ example: '£' })
    @IsOptional()
    @IsString()
    symbol?: string;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    isBase?: boolean;
}

export class UpdateCurrencyDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    symbol?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isBase?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
