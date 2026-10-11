import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
    @ApiProperty({ type: 'string', example: 'admin123', description: 'Current password' })
    @IsString()
    @IsNotEmpty()
    currentPassword!: string;

    @ApiProperty({ type: 'string', example: 'newAdmin123', description: 'New password (min 8 characters)' })
    @IsString()
    @MinLength(8)
    newPassword!: string;
}
