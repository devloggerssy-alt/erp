import { Injectable } from '@nestjs/common';
import { resources } from '@devloggers/api-contracts';
import { AiToolProvider, defineCrudAiTools, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { BankAccountsService } from './services/bank-accounts.service';
import { CreateBankAccountDto, UpdateBankAccountDto } from './dto';
import { BANK_ACCOUNTS_FILTER_SCHEMA } from './controllers/bank-accounts.controller';

@AiToolProvider()
@Injectable()
export class BankAccountsAiTools implements AiToolSource {
    constructor(private readonly bankAccounts: BankAccountsService) {}

    aiTools(): readonly AiTool[] {
        return defineCrudAiTools({
            prefix: 'bank-accounts',
            resource: resources.bankAccounts.key,
            domain: 'invoicing',
            label: 'bank account',
            service: this.bankAccounts,
            createDto: CreateBankAccountDto,
            updateDto: UpdateBankAccountDto,
            filterSchema: BANK_ACCOUNTS_FILTER_SCHEMA,
            searchFields: ['code', 'name'],
            permissions: { view: 'bankAccounts.view', create: 'bankAccounts.create', update: 'bankAccounts.update' },
        });
    }
}
