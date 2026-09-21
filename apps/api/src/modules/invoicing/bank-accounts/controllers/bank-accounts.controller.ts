import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BankAccountsService } from '../services/bank-accounts.service';
import { CreateBankAccountDto, UpdateBankAccountDto, BankAccountResponseDto } from '../dto';
import { createCrudController, type CrudOpenApi } from '@devloggers/backend-core';
import { JwtAuthGuard, PermissionsGuard } from '@/modules/identity/auth/guards';
import { currencyResource } from '@devloggers/api-contracts';

const BANK_ACCOUNTS_OPENAPI = {
    list: {
        operation: { summary: 'List bank accounts' },
        responseDescription: 'Paginated list of bank accounts',
    },
    show: {
        operation: { summary: 'Get a bank account by ID' },
        responseDescription: 'Bank account details',
        idParam: { description: 'Bank account UUID' },
    },
    create: {
        operation: { summary: 'Create a bank account', description: 'Bank account code must be unique within the tenant.' },
        responseDescription: 'Bank account created successfully',
    },
    update: {
        operation: { summary: 'Update a bank account' },
        responseDescription: 'Updated bank account',
        idParam: { description: 'Bank account UUID' },
    },
    delete: {
        operation: { summary: 'Delete a bank account' },
        noContentDescription: 'Bank account deleted successfully',
        idParam: { description: 'Bank account UUID' },
    },
} satisfies CrudOpenApi;

const BankAccountsCrudBase = createCrudController({
    responseDto: BankAccountResponseDto,
    createDto: CreateBankAccountDto,
    updateDto: UpdateBankAccountDto,
    filterSchema: [
        { field: 'code', type: 'string' },
        { field: 'name', type: 'string', localized: true },
        { field: 'currencyId', type: 'id', foreignResourceKey: currencyResource.key },
    ],
    permissions: {
      view: 'bankAccounts.view',
      create: 'bankAccounts.create',
      update: 'bankAccounts.update',
      delete: 'bankAccounts.delete',
    },
    openApi: BANK_ACCOUNTS_OPENAPI,
});

@ApiTags('Invoicing / BankAccounts')
@Controller('bank-accounts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class BankAccountsController extends BankAccountsCrudBase {
    constructor(private readonly bankAccountsService: BankAccountsService) {
        super(bankAccountsService, 'BankAccount');
    }
}
