import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { CurrenciesService } from './currencies.service';
import { CreateCurrencyDto, UpdateCurrencyDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, RequestUser } from '../auth/decorators';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';
import { ApiStandardErrors } from '../../common/decorators/api-swagger.decorators';

@ApiTags('Currencies')
@Controller('currencies')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CurrenciesController {
    constructor(private readonly currenciesService: CurrenciesService) {}

    @Get()
    @ApiOperation({ summary: 'List all currencies' })
    @ApiOkResponse({
        description: 'Currencies list retrieved',
        schema: {
            example: {
                message: 'Currencies list',
                data: [
                    { id: '00000000-0000-4000-a300-000000000001', code: 'SYP', name: 'Syrian Pound', symbol: 'ل.س', exchangeRate: 1 },
                    { id: '00000000-0000-4000-a300-000000000002', code: 'USD', name: 'US Dollar', symbol: '$', exchangeRate: 14500 },
                ],
            },
        },
    })
    @ApiStandardErrors()
    async findAll(@CurrentUser() user: RequestUser) {
        const currencies = await this.currenciesService.findAll(user.tenantId);
        return ApiResponseBuilder.success(currencies, 'Currencies list');
    }

    @Post()
    @ApiOperation({ summary: 'Create a new currency' })
    @ApiCreatedResponse({
        description: 'Currency created',
        schema: {
            example: {
                message: 'Currency created',
                data: { id: '00000000-0000-4000-a300-000000000003', code: 'EUR', name: 'Euro', symbol: '€', exchangeRate: 15800 },
            },
        },
    })
    @ApiStandardErrors()
    async create(@CurrentUser() user: RequestUser, @Body() dto: CreateCurrencyDto) {
        const currency = await this.currenciesService.create(user.tenantId, dto);
        return ApiResponseBuilder.success(currency, 'Currency created');
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a currency' })
    @ApiOkResponse({
        description: 'Currency updated',
        schema: {
            example: {
                message: 'Currency updated',
                data: { id: '00000000-0000-4000-a300-000000000002', code: 'USD', exchangeRate: 15000 },
            },
        },
    })
    @ApiStandardErrors()
    async update(
        @CurrentUser() user: RequestUser,
        @Param('id') id: string,
        @Body() dto: UpdateCurrencyDto,
    ) {
        const currency = await this.currenciesService.update(user.tenantId, id, dto);
        return ApiResponseBuilder.success(currency, 'Currency updated');
    }
}
