import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
    @ApiPropertyOptional({ type: 'string', example: 'Sara Al-Amin', description: 'Display name' })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    fullName?: string;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: '+963-933-111222' })
    @IsOptional()
    @IsString()
    phone?: string | null;

    @ApiPropertyOptional({
        type: 'string',
        nullable: true,
        example: '/uploads/tenant-id/avatars/user-id/avatar-uuid.png',
        description: 'Avatar URL returned by POST /files/avatar; null removes the avatar',
    })
    @IsOptional()
    @IsString()
    avatarUrl?: string | null;
}

export class ProfileResponseDto {
    @ApiProperty({ type: 'string', example: '00000000-0000-4000-a200-000000000001' })
    id: string = '';

    @ApiProperty({ type: 'string', example: 'admin@demo-shop.com' })
    email: string = '';

    @ApiProperty({ type: 'string', example: 'Admin User' })
    fullName: string = '';

    @ApiPropertyOptional({ type: 'string', nullable: true, example: null })
    phone: string | null = null;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: null })
    avatarUrl: string | null = null;
}
