import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
    @ApiProperty({ example: 'Accountant', description: 'Role display name' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({ example: 'Accounting and finance access', description: 'Role description' })
    @IsOptional()
    @IsString()
    description?: string;
}

export class UpdateRoleDto {
    @ApiPropertyOptional({ example: 'Senior Accountant' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ example: 'Full accounting, finance, and reporting access' })
    @IsOptional()
    @IsString()
    description?: string;
}

export class RoleResponseDto {
    @ApiProperty({ example: '00000000-0000-4000-b100-000000000001' })
    id: string = '';

    @ApiProperty({ example: 'Accountant' })
    name: string = '';

    @ApiProperty({ example: 'Accounting and finance access', nullable: true })
    description: string | null = null;

    @ApiProperty({ example: false })
    isSystem: boolean = false;

    @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
    createdAt: string = '';

    @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
    updatedAt: string = '';
}
