import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsBoolean,
    IsArray,
    IsEnum,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocalizedStringDto } from '@devloggers/backend-core';
import { customFieldModules, fieldTypes } from '@devloggers/api-contracts';
import type { CustomFieldValuesMap } from '@devloggers/api-contracts';

export class CreateCustomFieldDto {
    @ApiProperty({ example: customFieldModules.items })
    @IsString()
    @IsNotEmpty()
    module: string = customFieldModules.items;

    @ApiProperty({ type: LocalizedStringDto })
    @ValidateNested()
    @Type(() => LocalizedStringDto)
    name: LocalizedStringDto = new LocalizedStringDto();

    @ApiProperty({ type: LocalizedStringDto })
    @ValidateNested()
    @Type(() => LocalizedStringDto)
    label: LocalizedStringDto = new LocalizedStringDto();

    @ApiProperty({ enum: fieldTypes })
    @IsEnum(fieldTypes)
    type: keyof typeof fieldTypes = fieldTypes.TEXT;

    @ApiPropertyOptional({ example: '' })
    @IsOptional()
    @IsString()
    defaultValue?: string;

    @ApiPropertyOptional({ type: LocalizedStringDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => LocalizedStringDto)
    placeholder?: LocalizedStringDto;

    @ApiPropertyOptional({ type: [String], example: ['Red', 'Blue'] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    options?: string[];

    @ApiPropertyOptional({ example: false })
    @IsOptional()
    @IsBoolean()
    isRequired?: boolean;

    @ApiPropertyOptional({ example: false })
    @IsOptional()
    @IsBoolean()
    showInList?: boolean;
}

export class UpdateCustomFieldDto {
    @ApiPropertyOptional({ type: LocalizedStringDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => LocalizedStringDto)
    name?: LocalizedStringDto;

    @ApiPropertyOptional({ type: LocalizedStringDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => LocalizedStringDto)
    label?: LocalizedStringDto;

    @ApiPropertyOptional({ enum: fieldTypes })
    @IsOptional()
    @IsEnum(fieldTypes)
    type?: keyof typeof fieldTypes;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    defaultValue?: string;

    @ApiPropertyOptional({ type: LocalizedStringDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => LocalizedStringDto)
    placeholder?: LocalizedStringDto;

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    options?: string[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isRequired?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    showInList?: boolean;
}

export class CustomFieldResponseDto {
    @ApiProperty()
    id: string = '';

    @ApiProperty({ example: customFieldModules.items })
    module: string = customFieldModules.items;

    @ApiProperty({ type: LocalizedStringDto })
    name: LocalizedStringDto = new LocalizedStringDto();

    @ApiProperty({ type: LocalizedStringDto })
    label: LocalizedStringDto = new LocalizedStringDto();

    @ApiProperty({ enum: fieldTypes })
    type: keyof typeof fieldTypes = fieldTypes.TEXT;

    @ApiProperty({ nullable: true })
    defaultValue: string | null = null;

    @ApiProperty({ type: LocalizedStringDto, nullable: true })
    placeholder: LocalizedStringDto | null = null;

    @ApiProperty({ type: [String] })
    options: string[] = [];

    @ApiProperty()
    isRequired: boolean = false;

    @ApiProperty()
    showInList: boolean = false;

    @ApiProperty()
    createdAt: string = '';
}

export class CustomFieldValuesDto {
    @ApiPropertyOptional({
        type: 'object',
        additionalProperties: true,
        description: 'Map of custom field ID to value',
    })
    @IsOptional()
    customFields?: CustomFieldValuesMap;
}
