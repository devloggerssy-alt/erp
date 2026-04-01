import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CurrenciesService } from './currencies.service';
import { CreateCurrencyDto, UpdateCurrencyDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, RequestUser } from '../auth/decorators';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';

@ApiTags('Currencies')
@Controller('currencies')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CurrenciesController {
    constructor(private readonly currenciesService: CurrenciesService) {}

    @Get()
    async findAll(@CurrentUser() user: RequestUser) {
        const currencies = await this.currenciesService.findAll(user.tenantId);
        return ApiResponseBuilder.success(currencies, 'Currencies list');
    }

    @Post()
    async create(@CurrentUser() user: RequestUser, @Body() dto: CreateCurrencyDto) {
        const currency = await this.currenciesService.create(user.tenantId, dto);
        return ApiResponseBuilder.success(currency, 'Currency created');
    }

    @Patch(':id')
    async update(
        @CurrentUser() user: RequestUser,
        @Param('id') id: string,
        @Body() dto: UpdateCurrencyDto,
    ) {
        const currency = await this.currenciesService.update(user.tenantId, id, dto);
        return ApiResponseBuilder.success(currency, 'Currency updated');
    }
}
