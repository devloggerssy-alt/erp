import { ApiProperty } from '@nestjs/swagger';

export class AuthTenantDto {
    @ApiProperty({ example: '00000000-0000-4000-a000-000000000001' })
    id: string = '';

    @ApiProperty({ example: 'Demo Shop' })
    name: string = '';

    @ApiProperty({ example: 'demo-shop' })
    slug: string = '';

    @ApiProperty({ example: 0 })
    onboardingStep: number = 0;

    @ApiProperty({ nullable: true, example: null })
    onboardingCompletedAt: string | null = null;
}

export class AuthUserDto {
    @ApiProperty({ example: '00000000-0000-4000-a200-000000000001' })
    id: string = '';

    @ApiProperty({ example: '00000000-0000-4000-a000-000000000001' })
    tenantId: string = '';

    @ApiProperty({ example: 'admin@demo-shop.com' })
    email: string = '';

    @ApiProperty({ example: 'Admin User' })
    fullName: string = '';

    @ApiProperty({ type: [String], example: ['Admin'] })
    roles: string[] = [];

    @ApiProperty({ type: AuthTenantDto })
    tenant: AuthTenantDto = new AuthTenantDto();
}

export class LoginDataDto {
    @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
    accessToken: string = '';

    @ApiProperty({ type: AuthUserDto })
    user: AuthUserDto = new AuthUserDto();
}

export class MeDataDto extends AuthUserDto {
    @ApiProperty({ nullable: true, example: null })
    phone?: string | null;
}
