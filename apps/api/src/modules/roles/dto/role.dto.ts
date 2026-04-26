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
