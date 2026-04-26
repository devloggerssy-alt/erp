import {
    IsEmail, IsNotEmpty, IsString, IsOptional, IsArray,
    MinLength, IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
    @ApiProperty({ example: 'accountant@demo-shop.com', description: 'User email (unique per tenant)' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'user123', description: 'Password (min 8 characters)' })
    @IsString()
    @MinLength(8)
    password: string;

    @ApiProperty({ example: 'Sara Al-Amin', description: 'Full display name' })
    @IsString()
    @IsNotEmpty()
    fullName: string;

    @ApiPropertyOptional({ example: '+963-933-111222' })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional({ type: [String], example: ['00000000-0000-4000-a100-000000000002'], description: 'Array of role IDs to assign (Accountant role)' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    roleIds?: string[];
}

export class UpdateUserDto {
    @ApiPropertyOptional({ example: 'newemail@demo-shop.com' })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({ example: 'Sara Al-Amin (Updated)' })
    @IsOptional()
    @IsString()
    fullName?: string;

    @ApiPropertyOptional({ example: '+963-933-999888' })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional({ type: [String], example: ['00000000-0000-4000-a100-000000000002', '00000000-0000-4000-a100-000000000001'], description: 'Updated role IDs' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    roleIds?: string[];
}

export class UpdateUserStatusDto {
    @ApiProperty({ example: false, description: 'Set user active/inactive' })
    @IsBoolean()
    isActive: boolean;
}
