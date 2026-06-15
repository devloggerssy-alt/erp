import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
    @ApiProperty({ example: 'Demo Shop', description: 'Company / organization name' })
    @IsString()
    @IsNotEmpty()
    companyName: string;

    @ApiProperty({ example: 'Admin User', description: 'Full name of the account owner' })
    @IsString()
    @IsNotEmpty()
    fullName: string;

    @ApiProperty({ example: 'admin@demo-shop.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'admin123', description: 'Password (min 8 characters)' })
    @IsString()
    @MinLength(8)
    password: string;

    @ApiPropertyOptional({ example: '+963-11-1234567' })
    @IsOptional()
    @IsString()
    phone?: string;
}
