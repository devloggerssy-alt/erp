import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import type { SetupTask, SetupTaskType } from '@devloggers/db-prisma';
import { RequestContext } from '../../../../common/request-context/request-context';
import { BusinessSetupTaskService } from './business-setup-task.service';
import { BusinessSetupReadinessService } from './business-setup-readiness.service';
import { BusinessSetupTenantRepository } from '../repositories/business-setup-tenant.repository';
import {
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
    type SetupTaskHandler,
} from '../handlers';

@Injectable()
export class BusinessSetupOrchestratorService {
    private readonly handlers: Map<SetupTaskType, SetupTaskHandler>;

    constructor(
        private readonly taskService: BusinessSetupTaskService,
        private readonly readinessService: BusinessSetupReadinessService,
        private readonly tenantRepository: BusinessSetupTenantRepository,
        currencies: CurrenciesTaskHandler,
        chartOfAccounts: ChartOfAccountsTaskHandler,
        financialMappings: FinancialMappingsTaskHandler,
        cashboxes: CashboxesTaskHandler,
        bankAccounts: BankAccountsTaskHandler,
        fiscalPeriod: FiscalPeriodTaskHandler,
        documentSequences: DocumentSequencesTaskHandler,
        openingCashBalances: OpeningCashBalancesTaskHandler,
        openingBankBalances: OpeningBankBalancesTaskHandler,
        openingReceivables: OpeningReceivablesTaskHandler,
        openingPayables: OpeningPayablesTaskHandler,
        reconciliation: ReconciliationTaskHandler,
    ) {
        this.handlers = new Map<SetupTaskType, SetupTaskHandler>([
            ['CURRENCIES', currencies],
            ['CHART_OF_ACCOUNTS', chartOfAccounts],
            ['FINANCIAL_MAPPINGS', financialMappings],
            ['CASHBOXES', cashboxes],
            ['BANK_ACCOUNTS', bankAccounts],
            ['FISCAL_PERIOD', fiscalPeriod],
            ['DOCUMENT_SEQUENCES', documentSequences],
            ['OPENING_CASH_BALANCES', openingCashBalances],
            ['OPENING_BANK_BALANCES', openingBankBalances],
            ['OPENING_RECEIVABLES', openingReceivables],
            ['OPENING_PAYABLES', openingPayables],
            ['RECONCILIATION', reconciliation],
        ]);
    }

    async execute(tenantId: string, userId: string, type: SetupTaskType, payload: unknown): Promise<SetupTask> {
        const task = await this.taskService.getTaskOrFail(tenantId, type);
        if (task.status !== 'READY') {
            throw new ConflictException(`Setup task "${type}" is not ready (current status: ${task.status})`);
        }

        const handler = this.handlers.get(type);
        if (!handler) {
            throw new BadRequestException(`Setup task "${type}" has no executable handler; complete it via its own resource page`);
        }

        const result = await RequestContext.run(
            { source: 'BUSINESS_SETUP', metadata: { taskType: type } },
            () => handler.execute(tenantId, userId, payload),
        );

        await this.taskService.recordAttempt(tenantId, type, result.completed, result.details);

        // Phase 10.4.3 — businessSetupCompletedAt is written in exactly one place:
        // when the reconciliation task completes (i.e. the Phase 7 run passed).
        if (type === 'RECONCILIATION' && result.completed) {
            await this.tenantRepository.setCompletedAt(tenantId, new Date());
        }

        await this.readinessService.refresh(tenantId);
        return this.taskService.getTaskOrFail(tenantId, type);
    }
}
