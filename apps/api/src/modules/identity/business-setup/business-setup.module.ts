import { Module } from '@nestjs/common';
import { PrismaModule } from '@devloggers/db-prisma/nest';
import { CurrenciesModule } from '../../accounting/currencies/currencies.module';
import { ChartOfAccountsBootstrapModule } from '../../accounting/accounts/bootstrap/chart-of-accounts-bootstrap.module';
import { FinancialSettingsModule } from '../../accounting/financial-settings/financial-settings.module';
import { FiscalPeriodsModule } from '../../accounting/fiscal-periods/fiscal-periods.module';
import { DocumentSequencesModule } from '../../accounting/document-sequences/document-sequences.module';
import { OpeningBalancesModule } from '../../accounting/opening-balances/opening-balances.module';
import { ReconciliationModule } from '../../accounting/reconciliation/reconciliation.module';
import { CashboxesModule, BankAccountsModule } from '../../invoicing';
import { SetupTasksRepository } from './repositories/setup-tasks.repository';
import { BusinessSetupTenantRepository } from './repositories/business-setup-tenant.repository';
import { BusinessSetupDiscoveryService } from './services/business-setup-discovery.service';
import { BusinessSetupReadinessService } from './services/business-setup-readiness.service';
import { BusinessSetupPlanService } from './services/business-setup-plan.service';
import { BusinessSetupTaskService } from './services/business-setup-task.service';
import { BusinessSetupProfileService } from './services/business-setup-profile.service';
import { BusinessSetupOrchestratorService } from './services/business-setup-orchestrator.service';
import { SetupTaskPresenter } from './presenters/setup-task.presenter';
import { BusinessSetupController } from './controllers/business-setup.controller';
import {
    CurrenciesTaskHandler, ChartOfAccountsTaskHandler, FinancialMappingsTaskHandler,
    CashboxesTaskHandler, BankAccountsTaskHandler, FiscalPeriodTaskHandler, DocumentSequencesTaskHandler,
    OpeningCashBalancesTaskHandler, OpeningBankBalancesTaskHandler, OpeningReceivablesTaskHandler,
    OpeningPayablesTaskHandler, ReconciliationTaskHandler,
} from './handlers';

@Module({
    imports: [
        PrismaModule,
        CurrenciesModule,
        ChartOfAccountsBootstrapModule,
        FinancialSettingsModule,
        FiscalPeriodsModule,
        DocumentSequencesModule,
        OpeningBalancesModule,
        ReconciliationModule,
        CashboxesModule,
        BankAccountsModule,
    ],
    controllers: [BusinessSetupController],
    providers: [
        SetupTasksRepository,
        BusinessSetupTenantRepository,
        BusinessSetupReadinessService,
        BusinessSetupDiscoveryService,
        BusinessSetupPlanService,
        BusinessSetupTaskService,
        BusinessSetupProfileService,
        BusinessSetupOrchestratorService,
        SetupTaskPresenter,
        CurrenciesTaskHandler,
        ChartOfAccountsTaskHandler,
        FinancialMappingsTaskHandler,
        CashboxesTaskHandler,
        BankAccountsTaskHandler,
        FiscalPeriodTaskHandler,
        DocumentSequencesTaskHandler,
        OpeningCashBalancesTaskHandler,
        OpeningBankBalancesTaskHandler,
        OpeningReceivablesTaskHandler,
        OpeningPayablesTaskHandler,
        ReconciliationTaskHandler,
    ],
})
export class BusinessSetupModule {}
