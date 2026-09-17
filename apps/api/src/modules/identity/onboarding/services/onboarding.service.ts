import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { SettingsService } from '../../settings/services/settings.service';
import { FiscalPeriodsService } from '../../../accounting/fiscal-periods/services/fiscal-periods.service';
import { DocumentSequencesService } from '../../../accounting/document-sequences/services/document-sequences.service';
import { FinancialSettingsService } from '../../../accounting/financial-settings/services/financial-settings.service';
import { CurrenciesService } from '../../../accounting/currencies/services/currencies.service';
import { ChartOfAccountsBootstrapService } from '../../../accounting/accounts/bootstrap/chart-of-accounts-bootstrap.service';
import type {
    OnboardingCompanyStepDto,
    OnboardingFiscalYearStepDto,
    OnboardingGlDefaultsStepDto,
    OnboardingDocumentSequencesStepDto,
    OnboardingCurrenciesStepDto,
} from '../dto/onboarding.dto';

const GL_AUTO_MAPPED_CODES = ['1130', '5100', '5210', '3100', '1110', '1150'] as const;

@Injectable()
export class OnboardingService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly settingsService: SettingsService,
        private readonly fiscalPeriodsService: FiscalPeriodsService,
        private readonly documentSequencesService: DocumentSequencesService,
        private readonly financialSettingsService: FinancialSettingsService,
        private readonly currenciesService: CurrenciesService,
        private readonly chartOfAccountsBootstrap: ChartOfAccountsBootstrapService,
    ) {}

    private async assertNotCompleted(tenantId: string): Promise<void> {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { onboardingCompletedAt: true },
        });
        if (tenant?.onboardingCompletedAt) {
            throw new ConflictException('Onboarding is already completed');
        }
    }

    private async advanceStep(tenantId: string, step: number): Promise<void> {
        await this.prisma.tenant.update({
            where: { id: tenantId },
            data: { onboardingStep: step },
        });
    }

    async stepCompany(tenantId: string, dto: OnboardingCompanyStepDto): Promise<void> {
        await this.assertNotCompleted(tenantId);

        await this.prisma.tenant.update({
            where: { id: tenantId },
            data: { name: dto.name, address: dto.address, phone: dto.phone },
        });

        await this.settingsService.update(tenantId, {
            locale: dto.locale,
            timezone: dto.timezone,
            dateFormat: dto.dateFormat,
            numberFormat: dto.numberFormat,
        });

        await this.advanceStep(tenantId, 1);
    }

    async stepFiscalYear(tenantId: string, dto: OnboardingFiscalYearStepDto): Promise<void> {
        await this.assertNotCompleted(tenantId);

        try {
            const name = dto.name ?? `FY ${new Date(dto.startDate).getFullYear()}`;
            await this.fiscalPeriodsService.create(tenantId, {
                name,
                startDate: dto.startDate,
                endDate: dto.endDate,
            });
        } catch (err: unknown) {
            if (!(err instanceof BadRequestException) && !(err instanceof ConflictException)) {
                throw err;
            }
            // period already exists or overlaps — idempotent, continue
        }

        await this.advanceStep(tenantId, 2);
    }

    async stepChartOfAccounts(tenantId: string): Promise<Record<string, string>> {
        await this.assertNotCompleted(tenantId);
        const codeToId = await this.chartOfAccountsBootstrap.bootstrapDefaultTemplate(tenantId);
        await this.advanceStep(tenantId, 3);
        return codeToId;
    }

    async stepGlDefaults(tenantId: string, dto: OnboardingGlDefaultsStepDto): Promise<void> {
        await this.assertNotCompleted(tenantId);

        const ids = await this.chartOfAccountsBootstrap.resolveIdsByCode(tenantId, [...GL_AUTO_MAPPED_CODES]);

        await this.financialSettingsService.upsert(tenantId, {
            defaultSalesAccountId: dto.defaultSalesAccountId,
            defaultPurchaseAccountId: dto.defaultPurchaseAccountId,
            defaultTaxAccountId: dto.defaultTaxAccountId,
            defaultReceivableAccountId: dto.defaultReceivableAccountId,
            defaultPayableAccountId: dto.defaultPayableAccountId,
            defaultInventoryAccountId: ids['1130'],
            defaultCogsAccountId: ids['5100'],
            defaultInventoryAdjustmentAccountId: ids['5210'],
            defaultOpeningEquityAccountId: ids['3100'],
            defaultCashAccountId: ids['1110'],
            defaultBankAccountId: ids['1150'],
        });

        await this.advanceStep(tenantId, 5);
    }

    async stepCurrencies(tenantId: string, dto: OnboardingCurrenciesStepDto): Promise<void> {
        await this.assertNotCompleted(tenantId);

        const existing = await this.currenciesService.list(tenantId, { take: 1 });
        if (existing.total === 0) {
            let baseCurrencyId: string | undefined;
            for (const currency of dto.currencies) {
                const created = await this.currenciesService.create(tenantId, currency);
                if (currency.isBase) baseCurrencyId = created.id;
            }
            if (baseCurrencyId) {
                await this.prisma.tenant.update({ where: { id: tenantId }, data: { baseCurrencyId } });
            }
        }

        await this.advanceStep(tenantId, 4);
    }

    async stepDocumentSequences(tenantId: string, dto: OnboardingDocumentSequencesStepDto): Promise<void> {
        await this.assertNotCompleted(tenantId);

        for (const seq of dto.sequences) {
            try {
                await this.documentSequencesService.create(tenantId, {
                    documentType: seq.type,
                    prefix: seq.prefix,
                    nextNumber: seq.startNumber ?? 1,
                    padding: seq.padLength ?? 5,
                });
            } catch (err: unknown) {
                if (err instanceof ConflictException) continue;
                throw err;
            }
        }

        await this.advanceStep(tenantId, 6);
    }

    async complete(tenantId: string): Promise<void> {
        await this.assertNotCompleted(tenantId);
        await this.prisma.tenant.update({
            where: { id: tenantId },
            data: { onboardingCompletedAt: new Date(), onboardingStep: 6 },
        });
    }
}
