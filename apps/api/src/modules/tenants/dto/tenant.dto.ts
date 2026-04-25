import { IsString, IsNotEmpty, IsEmail, IsOptional, MinLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantDto {
    @ApiProperty({ example: 'Demo Shop', description: 'Company / tenant name' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'demo-shop', description: 'URL-friendly slug (lowercase, alphanumeric, dashes)' })
    @IsString()
    @IsNotEmpty()
    @Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase alphanumeric with dashes' })
    slug: string;

    @ApiPropertyOptional({ example: 'Damascus, Syria' })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiPropertyOptional({ example: '+963-11-1234567' })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional({ example: 'admin@demo-shop.com' })
    @IsOptional()
    @IsEmail()
    email?: string;

    // Initial admin user created with tenant
    @ApiProperty({ example: 'admin@demo-shop.com', description: 'Email for the initial admin user' })
    @IsEmail()
    adminEmail: string;

    @ApiProperty({ example: 'admin123', description: 'Password for the initial admin user (min 8 chars)' })
    @IsString()
    @MinLength(8)
    adminPassword: string;

    @ApiProperty({ example: 'Admin User', description: 'Full name of the initial admin' })
    @IsString()
    @IsNotEmpty()
    adminFullName: string;
}

export class UpdateTenantDto {
    @ApiPropertyOptional({ example: 'Demo Shop (Updated)' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ example: 'Damascus, Syria – Branch 2' })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiPropertyOptional({ example: '+963-11-7654321' })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional({ example: 'contact@demo-shop.com' })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({ example: 'https://cdn.demo-shop.com/logo.png', description: 'Logo URL' })
    @IsOptional()
    @IsString()
    logo?: string;
}
