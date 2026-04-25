import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PartyTypeEnum {
    CUSTOMER = 'CUSTOMER',
    SUPPLIER = 'SUPPLIER',
    CUSTOMER_SUPPLIER = 'CUSTOMER_SUPPLIER'
}

export class CreatePartyDto {
    @ApiPropertyOptional({ example: 'SUPP-001', description: 'Auto-generated if omitted' })
    @IsOptional()
    @IsString()
    code?: string;

    @ApiProperty({ example: 'Damascus Import Co.', description: 'Party display name' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ enum: PartyTypeEnum, example: 'SUPPLIER' })
    @IsEnum(PartyTypeEnum)
    @IsNotEmpty()
    type: PartyTypeEnum;

    @ApiPropertyOptional({ example: '+963-11-9876543' })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional({ example: 'info@damsimport.sy' })
    @IsOptional()
    @IsString()
    email?: string;

    @ApiPropertyOptional({ example: 'Damascus, Industrial Zone' })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiPropertyOptional({ example: 0, description: 'Initial opening balance in base currency' })
    @IsOptional()
    @IsNumber()
    openingBalance?: number;
}

export class UpdatePartyDto {
    @ApiPropertyOptional({ example: 'SUPP-001' })
    @IsOptional()
    @IsString()
    code?: string;

    @ApiPropertyOptional({ example: 'Damascus Import Co. (Updated)' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ enum: PartyTypeEnum, example: 'CUSTOMER_SUPPLIER' })
    @IsOptional()
    @IsEnum(PartyTypeEnum)
    type?: PartyTypeEnum;

    @ApiPropertyOptional({ example: '+963-11-9876544' })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional({ example: 'updated@damsimport.sy' })
    @IsOptional()
    @IsString()
    email?: string;

    @ApiPropertyOptional({ example: 'Damascus, New Industrial Zone' })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiPropertyOptional({ example: 500000 })
    @IsOptional()
    @IsNumber()
    openingBalance?: number;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class UpdatePartyStatusDto {
    @ApiProperty({ example: false, description: 'Set party active/inactive' })
    @IsBoolean()
    @IsNotEmpty()
    isActive: boolean;
}
