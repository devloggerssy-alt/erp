import { Injectable } from '@nestjs/common';
import { resources } from '@devloggers/api-contracts';
import { AiToolProvider, defineCrudAiTools, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { CurrenciesService } from './services/currencies.service';
import { CreateCurrencyDto, UpdateCurrencyDto } from './dto';
import { CURRENCIES_FILTER_SCHEMA } from './controllers/currencies.controller';

@AiToolProvider()
@Injectable()
export class CurrenciesAiTools implements AiToolSource {
    constructor(private readonly currencies: CurrenciesService) {}

    aiTools(): readonly AiTool[] {
        return defineCrudAiTools({
            prefix: 'currencies',
            resource: resources.currencies.key,
            domain: 'accounting',
            label: 'currency',
            service: this.currencies,
            createDto: CreateCurrencyDto,
            updateDto: UpdateCurrencyDto,
            filterSchema: CURRENCIES_FILTER_SCHEMA,
            searchFields: ['code', 'name'],
            permissions: { view: 'currencies.view', create: 'currencies.create', update: 'currencies.update' },
            // Changing the base currency re-bases every exchange rate: UI-only.
            scope: { omitInputFields: ['isBase'] },
        });
    }
}
