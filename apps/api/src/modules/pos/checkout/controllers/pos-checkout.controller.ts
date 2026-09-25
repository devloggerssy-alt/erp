import { Controller, Post, Body, UseGuards, UsePipes } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { RequirePermission, createClassDtoBodyPipe, type RequestUser } from '@devloggers/backend-core';
import { JwtAuthGuard, PermissionsGuard } from '../../../identity/auth/guards';
import { CurrentUser } from '../../../identity/auth/decorators';
import { ApiResponseBuilder } from '../../../../common/api/api-response-builder';
import { PosCheckoutService } from '../services/pos-checkout.service';
import { CreatePosCheckoutDto, PosCheckoutResponseDto } from '../dto';

@ApiTags('POS / Checkout')
@Controller('pos/checkout')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class PosCheckoutController {
    constructor(private readonly checkoutService: PosCheckoutService) {}

    @Post()
    @RequirePermission('pos.checkout')
    @ApiOperation({
        summary: 'Ring up a POS sale',
        description: 'Creates and posts a sales invoice plus an allocated cash receipt in one atomic operation.',
    })
    @ApiOkResponse({ description: 'Sale completed', type: PosCheckoutResponseDto })
    @ApiBody({ type: CreatePosCheckoutDto, required: true })
    @UsePipes(createClassDtoBodyPipe(CreatePosCheckoutDto))
    async checkout(@CurrentUser() user: RequestUser, @Body() dto: CreatePosCheckoutDto) {
        const result = await this.checkoutService.checkout(user.tenantId, user.id, dto);
        return ApiResponseBuilder.success(result, 'Sale completed');
    }
}
