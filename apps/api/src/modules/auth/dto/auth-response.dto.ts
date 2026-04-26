import { ApiProperty } from '@nestjs/swagger';

export class AuthUserDto {
    @ApiProperty({ example: '00000000-0000-4000-a100-000000000001' })
    id: string;

    @ApiProperty({ example: '00000000-0000-4000-a000-000000000001' })
    tenantId: string;

    @ApiProperty({ example: 'admin@demo-shop.com' })
    email: string;

    @ApiProperty({ example: 'Admin User' })
    fullName: string;

    @ApiProperty({ type: [String], example: ['Admin'] })
    roles: string[];
}

export class LoginDataDto {
    @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
    accessToken: string;

    @ApiProperty({ type: AuthUserDto })
    user: AuthUserDto;
}

export class MeTenantDto {
    @ApiProperty({ example: '00000000-0000-4000-a000-000000000001' })
    id: string;

    @ApiProperty({ example: 'Demo Shop' })
    name: string;

    @ApiProperty({ example: 'demo-shop' })
    slug: string;
}

export class MeDataDto extends AuthUserDto {
    @ApiProperty({ nullable: true, example: null })
    phone?: string | null;

    @ApiProperty({ type: MeTenantDto })
    tenant: MeTenantDto;
}
