import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { AccountType } from '@devloggers/db-prisma';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { SettingsService } from '../../settings/services/settings.service';
import { FiscalPeriodsService } from '../../../accounting/fiscal-periods/services/fiscal-periods.service';
import { DocumentSequencesService } from '../../../accounting/document-sequences/services/document-sequences.service';
import { FinancialSettingsService } from '../../../accounting/financial-settings/services/financial-settings.service';
import type {
    OnboardingCompanyStepDto,
    OnboardingFiscalYearStepDto,
    OnboardingGlDefaultsStepDto,
    OnboardingDocumentSequencesStepDto,
} from '../dto/onboarding.dto';

@Injectable()
export class OnboardingService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly settingsService: SettingsService,
        private readonly fiscalPeriodsService: FiscalPeriodsService,
        private readonly documentSequencesService: DocumentSequencesService,
        private readonly financialSettingsService: FinancialSettingsService,
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
        const codeToId = await this.bootstrapChartOfAccounts(tenantId);
        await this.advanceStep(tenantId, 3);
        return codeToId;
    }

    async stepGlDefaults(tenantId: string, dto: OnboardingGlDefaultsStepDto): Promise<void> {
        await this.assertNotCompleted(tenantId);

        await this.financialSettingsService.upsert(tenantId, {
            defaultSalesAccountId: dto.defaultSalesAccountId,
            defaultPurchaseAccountId: dto.defaultPurchaseAccountId,
            defaultTaxAccountId: dto.defaultTaxAccountId,
            defaultReceivableAccountId: dto.defaultReceivableAccountId,
            defaultPayableAccountId: dto.defaultPayableAccountId,
        });

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

        await this.advanceStep(tenantId, 5);
    }

    async complete(tenantId: string): Promise<void> {
        await this.assertNotCompleted(tenantId);
        await this.prisma.tenant.update({
            where: { id: tenantId },
            data: { onboardingCompletedAt: new Date(), onboardingStep: 5 },
        });
    }

    private async bootstrapChartOfAccounts(tenantId: string): Promise<Record<string, string>> {
        const existing = await this.prisma.chartOfAccount.count({ where: { tenantId } });
        if (existing > 0) {
            const accounts = await this.prisma.chartOfAccount.findMany({
                where: { tenantId },
                select: { id: true, code: true },
            });
            return Object.fromEntries(accounts.map((a) => [a.code, a.id]));
        }

        const ids: Record<string, string> = {};
        const template = this.getCoaTemplate();
        for (const acct of template) {
            ids[acct.code] = crypto.randomUUID();
        }

        const n = (ar: string, en: string) => ({ ar, en });

        await this.prisma.$transaction(async (tx) => {
            const level1 = template.filter((a) => !a.parentCode);
            for (const acct of level1) {
                await tx.chartOfAccount.create({
                    data: {
                        id: ids[acct.code],
                        tenantId,
                        code: acct.code,
                        name: n(acct.nameAr, acct.nameEn),
                        type: acct.type,
                    },
                });
            }
            const level2 = template.filter((a) => {
                if (!a.parentCode) return false;
                return level1.some((l) => l.code === a.parentCode);
            });
            for (const acct of level2) {
                await tx.chartOfAccount.create({
                    data: {
                        id: ids[acct.code],
                        tenantId,
                        code: acct.code,
                        name: n(acct.nameAr, acct.nameEn),
                        type: acct.type,
                        parentId: ids[acct.parentCode!],
                    },
                });
            }
            const level3 = template.filter((a) => {
                if (!a.parentCode) return false;
                return level2.some((l) => l.code === a.parentCode);
            });
            for (const acct of level3) {
                await tx.chartOfAccount.create({
                    data: {
                        id: ids[acct.code],
                        tenantId,
                        code: acct.code,
                        name: n(acct.nameAr, acct.nameEn),
                        type: acct.type,
                        parentId: ids[acct.parentCode!],
                    },
                });
            }
        });

        return Object.fromEntries(template.map((a) => [a.code, ids[a.code]]));
    }

    private getCoaTemplate(): Array<{
        code: string;
        nameAr: string;
        nameEn: string;
        type: AccountType;
        parentCode?: string;
    }> {
        return [
            // Level 1
            { code: '1000', nameAr: 'الأصول',          nameEn: 'Assets',                    type: AccountType.ASSET },
            { code: '2000', nameAr: 'الالتزامات',       nameEn: 'Liabilities',               type: AccountType.LIABILITY },
            { code: '3000', nameAr: 'حقوق الملكية',     nameEn: 'Equity',                    type: AccountType.EQUITY },
            { code: '4000', nameAr: 'الإيرادات',        nameEn: 'Revenue',                   type: AccountType.REVENUE },
            { code: '5000', nameAr: 'تكلفة المبيعات',   nameEn: 'Cost of Sales',             type: AccountType.EXPENSE },
            { code: '6000', nameAr: 'المصروفات',        nameEn: 'Expenses',                  type: AccountType.EXPENSE },
            // Level 2
            { code: '1100', nameAr: 'الأصول المتداولة',               nameEn: 'Current Assets',          type: AccountType.ASSET,     parentCode: '1000' },
            { code: '1200', nameAr: 'الأصول غير المتداولة',           nameEn: 'Non-Current Assets',      type: AccountType.ASSET,     parentCode: '1000' },
            { code: '2100', nameAr: 'الالتزامات المتداولة',            nameEn: 'Current Liabilities',     type: AccountType.LIABILITY, parentCode: '2000' },
            { code: '2200', nameAr: 'الالتزامات غير المتداولة',        nameEn: 'Non-Current Liabilities', type: AccountType.LIABILITY, parentCode: '2000' },
            { code: '6100', nameAr: 'المصروفات التشغيلية',             nameEn: 'Operating Expenses',      type: AccountType.EXPENSE,   parentCode: '6000' },
            { code: '6200', nameAr: 'المصروفات الإدارية',             nameEn: 'Administrative Expenses', type: AccountType.EXPENSE,   parentCode: '6000' },
            // Level 3 — Current Assets
            { code: '1110', nameAr: 'النقد وما في حكمه',   nameEn: 'Cash and Cash Equivalents', type: AccountType.ASSET,     parentCode: '1100' },
            { code: '1120', nameAr: 'ذمم مدينة',            nameEn: 'Accounts Receivable',       type: AccountType.ASSET,     parentCode: '1100' },
            { code: '1130', nameAr: 'المخزون',              nameEn: 'Inventory',                 type: AccountType.ASSET,     parentCode: '1100' },
            { code: '1140', nameAr: 'مصروفات مدفوعة مقدماً', nameEn: 'Prepaid Expenses',         type: AccountType.ASSET,     parentCode: '1100' },
            // Level 3 — Non-Current Assets
            { code: '1210', nameAr: 'الأصول الثابتة',       nameEn: 'Fixed Assets',              type: AccountType.ASSET,     parentCode: '1200' },
            { code: '1220', nameAr: 'مجمع الإهلاك',         nameEn: 'Accumulated Depreciation',  type: AccountType.ASSET,     parentCode: '1200' },
            // Level 3 — Current Liabilities
            { code: '2110', nameAr: 'ذمم دائنة',            nameEn: 'Accounts Payable',          type: AccountType.LIABILITY, parentCode: '2100' },
            { code: '2120', nameAr: 'مصروفات مستحقة',       nameEn: 'Accrued Expenses',          type: AccountType.LIABILITY, parentCode: '2100' },
            { code: '2130', nameAr: 'قروض قصيرة الأجل',     nameEn: 'Short-term Loans',          type: AccountType.LIABILITY, parentCode: '2100' },
            { code: '2140', nameAr: 'ضريبة القيمة المضافة', nameEn: 'VAT Payable',               type: AccountType.LIABILITY, parentCode: '2100' },
            // Level 3 — Non-Current Liabilities
            { code: '2210', nameAr: 'قروض طويلة الأجل',     nameEn: 'Long-term Loans',           type: AccountType.LIABILITY, parentCode: '2200' },
            // Level 3 — Equity
            { code: '3100', nameAr: "حقوق صاحب العمل",      nameEn: "Owner's Equity",            type: AccountType.EQUITY,    parentCode: '3000' },
            { code: '3200', nameAr: 'الأرباح المحتجزة',     nameEn: 'Retained Earnings',         type: AccountType.EQUITY,    parentCode: '3000' },
            // Level 3 — Revenue
            { code: '4100', nameAr: 'إيرادات المبيعات',     nameEn: 'Sales Revenue',             type: AccountType.REVENUE,   parentCode: '4000' },
            { code: '4200', nameAr: 'إيرادات أخرى',         nameEn: 'Other Revenue',             type: AccountType.REVENUE,   parentCode: '4000' },
            // Level 3 — Cost of Sales
            { code: '5100', nameAr: 'تكلفة البضاعة المباعة', nameEn: 'Cost of Goods Sold',       type: AccountType.EXPENSE,   parentCode: '5000' },
            // Level 3 — Operating Expenses
            { code: '6110', nameAr: 'الرواتب والأجور',      nameEn: 'Salaries and Wages',        type: AccountType.EXPENSE,   parentCode: '6100' },
            { code: '6120', nameAr: 'مصروف الإيجار',        nameEn: 'Rent Expense',              type: AccountType.EXPENSE,   parentCode: '6100' },
            { code: '6130', nameAr: 'مصروف المرافق',        nameEn: 'Utilities Expense',         type: AccountType.EXPENSE,   parentCode: '6100' },
            { code: '6140', nameAr: 'مصروف النقل',          nameEn: 'Transportation Expense',    type: AccountType.EXPENSE,   parentCode: '6100' },
            // Level 3 — Administrative Expenses
            { code: '6210', nameAr: 'مستلزمات مكتبية',      nameEn: 'Office Supplies',           type: AccountType.EXPENSE,   parentCode: '6200' },
            { code: '6220', nameAr: 'الصيانة والإصلاحات',   nameEn: 'Maintenance and Repairs',   type: AccountType.EXPENSE,   parentCode: '6200' },
            { code: '6230', nameAr: 'مصروفات متنوعة',       nameEn: 'Miscellaneous Expense',     type: AccountType.EXPENSE,   parentCode: '6200' },
        ];
    }
}
