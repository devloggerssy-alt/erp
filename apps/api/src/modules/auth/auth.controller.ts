import {
    Controller,
    Post,
    Body,
    Get,
    UseGuards,
    Res,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import * as express from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto';
import { JwtAuthGuard } from './guards';
import { CurrentUser, RequestUser } from './decorators';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(
        @Body() dto: LoginDto,
        @Res({ passthrough: true }) res: express.Response,
    ) {
        const result = await this.authService.login(dto.email, dto.password);

        // Set access token as HTTP-only cookie
        res.cookie('access_token', result.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        });

        return ApiResponseBuilder.success(
            { user: result.user, accessToken: result.accessToken },
            'Login successful',
        );
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(@Res({ passthrough: true }) res: express.Response) {
        res.clearCookie('access_token');
        return ApiResponseBuilder.success(null, 'Logged out');
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    async me(@CurrentUser() user: RequestUser) {
        const data = await this.authService.getMe(user.id);
        return ApiResponseBuilder.success(data, 'Current user');
    }
}
