import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { PrismaModule } from '@devloggers/db-prisma/nest';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { CurrenciesModule } from './modules/currencies/currencies.module';
import { FiscalPeriodsModule } from './modules/fiscal-periods/fiscal-periods.module';
import { DocumentSequencesModule } from './modules/document-sequences/document-sequences.module';
import { UnitsModule } from './modules/units/units.module';
import { ItemCategoriesModule } from './modules/item-categories/item-categories.module';
import { ItemsModule } from './modules/items/items.module';
import { PartiesModule } from './modules/parties/parties.module';
import { WarehousesModule } from './modules/warehouses/warehouses.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { StockLedgerModule } from './modules/stock-ledger/stock-ledger.module';
import { InvoiceTypesModule } from './modules/invoice-types/invoice-types.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { CashboxesModule } from './modules/cashboxes/cashboxes.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { StockCountsModule } from './modules/stock-counts/stock-counts.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AiChatModule } from './modules/ai-chat/ai-chat.module';
import { AuditModule } from './modules/audit/audit.module';
import configuration from './config/configuration';
import { envValidationSchema } from './config/envValidator';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      validationSchema: envValidationSchema,
      load: [configuration],
    }),
    PrismaModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    RolesModule,
    CurrenciesModule,
    FiscalPeriodsModule,
    DocumentSequencesModule,
    UnitsModule,
    ItemCategoriesModule,
    ItemsModule,
    PartiesModule,
    WarehousesModule,
    InventoryModule,
    StockLedgerModule,
    InvoiceTypesModule,
    InvoicesModule,
    CashboxesModule,
    PaymentsModule,
    AccountingModule,
    StockCountsModule,
    ReportsModule,
    AiChatModule,
    AuditModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    },
  ],
})
export class AppModule {}
