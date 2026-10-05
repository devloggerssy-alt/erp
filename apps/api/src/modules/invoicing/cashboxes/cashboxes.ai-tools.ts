import { Injectable } from '@nestjs/common';
import { resources } from '@devloggers/api-contracts';
import { AiToolProvider, defineCrudAiTools, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { CashboxesService } from './services/cashboxes.service';
import { CreateCashboxDto, UpdateCashboxDto } from './dto';
import { CASHBOXES_FILTER_SCHEMA } from './controllers/cashboxes.controller';

@AiToolProvider()
@Injectable()
export class CashboxesAiTools implements AiToolSource {
    constructor(private readonly cashboxes: CashboxesService) {}

    aiTools(): readonly AiTool[] {
        return defineCrudAiTools({
            prefix: 'cashboxes',
            resource: resources.cashboxes.key,
            domain: 'invoicing',
            label: 'cashbox',
            service: this.cashboxes,
            createDto: CreateCashboxDto,
            updateDto: UpdateCashboxDto,
            filterSchema: CASHBOXES_FILTER_SCHEMA,
            searchFields: ['code', 'name'],
            permissions: { view: 'cashboxes.view', create: 'cashboxes.create', update: 'cashboxes.update' },
        });
    }
}
