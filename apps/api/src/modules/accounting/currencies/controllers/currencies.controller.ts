import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CurrenciesService } from '../services/currencies.service';
import { CreateCurrencyDto, UpdateCurrencyDto, CurrencyResponseDto } from '../dto';
import { createStandardCrudControllerBase, type StandardCrudOpenApi } from '@devloggers/backend-core';
import { JwtAuthGuard } from '@/modules/identity/auth/guards';

const CURRENCIES_OPENAPI = {
    list: {
        operation: { summary: 'List currencies' },
        responseDescription: 'Paginated list of currencies',
    },
    show: {
        operation: { summary: 'Get a currency by ID' },
        responseDescription: 'Currency details',
        idParam: { description: 'Currency UUID' },
    },
    create: {
        operation: { summary: 'Create a currency', description: 'Currency code must be unique within the tenant.' },
        responseDescription: 'Currency created successfully',
    },
    update: {
        operation: { summary: 'Update a currency', description: 'Setting isBase=true will unset the previous base currency.' },
        responseDescription: 'Updated currency',
        idParam: { description: 'Currency UUID' },
    },
    delete: {
        operation: { summary: 'Delete a currency' },
        noContentDescription: 'Currency deleted successfully',
        idParam: { description: 'Currency UUID' },
    },
} satisfies StandardCrudOpenApi;

const CurrenciesCrudBase = createStandardCrudControllerBase({
    responseDto: CurrencyResponseDto,
    createDto: CreateCurrencyDto,
    updateDto: UpdateCurrencyDto,
    openApi: CURRENCIES_OPENAPI,
});

@ApiTags('Accounting / Currencies')
@Controller('currencies')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CurrenciesController extends CurrenciesCrudBase {
    constructor(private readonly currenciesService: CurrenciesService) {
        super(currenciesService, 'Currency');
    }
}
