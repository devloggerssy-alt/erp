import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ChangePasswordController } from './change-password/change-password.controller';
import { ChangePasswordService } from './change-password/change-password.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesModule } from './roles/roles.module';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
    imports: [
        PassportModule,
        JwtModule.registerAsync({
            useFactory: (configService: ConfigService) => ({
                secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
                signOptions: {
                    expiresIn: configService.get<string>('JWT_ACCESS_EXPIRES_IN', '24h') as any,
                },
            }),
            inject: [ConfigService],
        }),
        RolesModule,
        TenantsModule,
    ],
    controllers: [AuthController, ChangePasswordController],
    providers: [AuthService, ChangePasswordService, JwtStrategy],
    exports: [AuthService],
})
export class AuthModule {}
