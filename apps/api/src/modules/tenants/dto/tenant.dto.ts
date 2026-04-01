import { IsString, IsNotEmpty, IsEmail, IsOptional, MinLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantDto {
    @ApiProperty({ example: 'My Shop' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'my-shop' })
    @IsString()
    @IsNotEmpty()
    @Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase alphanumeric with dashes' })
    slug: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    address?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsEmail()
    email?: string;

    // Initial admin user created with tenant
    @ApiProperty({ example: 'admin@myshop.com' })
    @IsEmail()
    adminEmail: string;

    @ApiProperty({ example: 'securePassword123' })
    @IsString()
    @MinLength(8)
    adminPassword: string;

    @ApiProperty({ example: 'Ahmad Ali' })
    @IsString()
    @IsNotEmpty()
    adminFullName: string;
}

export class UpdateTenantDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    address?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    logo?: string;
}
