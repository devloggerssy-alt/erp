import { IsArray, IsIn, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocalizedStringDto } from '@devloggers/backend-core';
import { ALL_PERMISSIONS, type PermissionKey } from '@devloggers/api-contracts';

export class CreateRoleDto {
    @ApiProperty({ type: LocalizedStringDto, description: 'Role display name' })
    @ValidateNested()
    @Type(() => LocalizedStringDto)
    name: LocalizedStringDto = new LocalizedStringDto();

    @ApiPropertyOptional({ type: LocalizedStringDto, description: 'Role description' })
    @IsOptional()
    @ValidateNested()
    @Type(() => LocalizedStringDto)
    description?: LocalizedStringDto;

    @ApiPropertyOptional({ type: [String], example: ['units.view', 'units.create'] })
    @IsOptional()
    @IsArray()
    @IsIn([...ALL_PERMISSIONS], { each: true })
    permissionKeys?: PermissionKey[];
}

export class UpdateRoleDto {
    @ApiPropertyOptional({ type: LocalizedStringDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => LocalizedStringDto)
    name?: LocalizedStringDto;

    @ApiPropertyOptional({ type: LocalizedStringDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => LocalizedStringDto)
    description?: LocalizedStringDto;

    @ApiPropertyOptional({ type: [String], example: ['units.view', 'units.create'] })
    @IsOptional()
    @IsArray()
    @IsIn([...ALL_PERMISSIONS], { each: true })
    permissionKeys?: PermissionKey[];
}

export class RoleResponseDto {
    @ApiProperty({ example: '00000000-0000-4000-b100-000000000001' })
    id: string = '';

    @ApiProperty({ example: 'محاسب' })
    name: string = '';

    @ApiProperty({ type: LocalizedStringDto })
    nameI18n: LocalizedStringDto = new LocalizedStringDto();

    @ApiProperty({ type: 'string', example: 'صلاحيات المحاسبة والمالية', nullable: true })
    description: string | null = null;

    @ApiPropertyOptional({ type: LocalizedStringDto, nullable: true })
    descriptionI18n: LocalizedStringDto | null = null;

    @ApiProperty({ example: false })
    isSystem: boolean = false;

    @ApiProperty({ type: [String], example: ['units.view', 'units.create'] })
    permissionKeys: PermissionKey[] = [];

    @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
    createdAt: string = '';

    @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
    updatedAt: string = '';
}
