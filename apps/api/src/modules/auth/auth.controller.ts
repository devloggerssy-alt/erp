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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto';
import { JwtAuthGuard } from './guards';
import { CurrentUser, RequestUser } from './decorators';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';
import { ApiStandardErrors } from '../../common/decorators/api-swagger.decorators';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Authenticate user', description: 'Validates email + password, returns a JWT access token and sets it as an HTTP-only cookie for subsequent requests.' })
    @ApiOkResponse({
        description: 'Login successful – JWT token returned and set as cookie',
        schema: {
            example: {
                message: 'Login successful',
                data: {
                    user: { id: '00000000-0000-4000-a100-000000000001', email: 'admin@demo-shop.com', name: 'Admin User' },
                    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                },
            },
        },
    })
    @ApiStandardErrors()
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
    @ApiOperation({ summary: 'Logout user', description: 'Clears the access_token HTTP-only cookie, effectively invalidating the session on the client side.' })
    @ApiOkResponse({
        description: 'Logged out – cookie cleared',
        schema: { example: { message: 'Logged out', data: null } },
    })
    @ApiStandardErrors()
    logout(@Res({ passthrough: true }) res: express.Response) {
        res.clearCookie('access_token');
        return ApiResponseBuilder.success(null, 'Logged out');
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get current user profile', description: 'Returns the full profile of the currently authenticated user based on the JWT token.' })
    @ApiOkResponse({
        description: 'Current user profile returned',
        schema: {
            example: {
                message: 'Current user',
                data: {
                    id: '00000000-0000-4000-a100-000000000001',
                    email: 'admin@demo-shop.com',
                    name: 'Admin User',
                    tenantId: '00000000-0000-4000-a000-000000000001',
                    role: { id: '00000000-0000-4000-a200-000000000001', name: 'Admin' },
                },
            },
        },
    })
    @ApiStandardErrors()
    async me(@CurrentUser() user: RequestUser) {
        const data = await this.authService.getMe(user.id);
        return ApiResponseBuilder.success(data, 'Current user');
    }
}
