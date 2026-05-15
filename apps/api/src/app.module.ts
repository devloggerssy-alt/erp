import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '@devloggers/db-prisma/nest';
import { AuthModule } from './modules/identity/auth/auth.module';
import { TenantsModule } from './modules/identity/tenants/tenants.module';
import { UsersModule } from './modules/identity/users/users.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { InvoicingModule } from './modules/invoicing/invoicing.module';
import { PartiesModule } from './modules/parties/parties.module';
import { StockLedgerModule } from './modules/inventory/stock-ledger/stock-ledger.module';
import { InvoicesModule } from './modules/invoicing/invoices/invoices.module';
import { PaymentsModule } from './modules/invoicing/payments/payments.module';
import { StockCountsModule } from './modules/inventory/stock-counts/stock-counts.module';
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
    EventEmitterModule.forRoot({ wildcard: false, delimiter: '.', global: true }),
    PrismaModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    CatalogModule,
    AccountingModule,
    InventoryModule,
    InvoicingModule,
    PartiesModule,
    StockLedgerModule,
    InvoicesModule,
    PaymentsModule,
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
export class AppModule { }
