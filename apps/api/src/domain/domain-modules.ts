import type { Type } from '@nestjs/common';
import { AccountingModule } from '../modules/accounting/accounting.module';
import { AiAgentModule } from '../modules/ai-agent/ai-agent.module';
import { AuditModule } from '../modules/audit/audit.module';
import { CatalogModule } from '../modules/catalog/catalog.module';
import { CustomFieldsModule } from '../modules/custom-fields/custom-fields.module';
import { FilesModule } from '../modules/files/files.module';
import { AuthModule } from '../modules/identity/auth/auth.module';
import { PermissionsModule } from '../modules/identity/auth/permissions/permissions.module';
import { BusinessSetupModule } from '../modules/identity/business-setup/business-setup.module';
import { OnboardingModule } from '../modules/identity/onboarding/onboarding.module';
import { SettingsModule } from '../modules/identity/settings/settings.module';
import { TenantsModule } from '../modules/identity/tenants/tenants.module';
import { UsersModule } from '../modules/identity/users/users.module';
import { InventoryModule } from '../modules/inventory/inventory.module';
import { StockCountsModule } from '../modules/inventory/stock-counts/stock-counts.module';
import { StockLedgerModule } from '../modules/inventory/stock-ledger/stock-ledger.module';
import { InvoicingModule } from '../modules/invoicing/invoicing.module';
import { PartiesModule } from '../modules/parties/parties.module';
import { CodeSequencesModule } from '../modules/platform/code-sequences/code-sequences.module';
import { ReportsModule } from '../modules/reports/reports.module';
import { resolveEnabledDomains, type DomainKey } from './manifest';

/**
 * Phase 8.2.1 — the Nest modules that compose each domain. `enabledModuleImports`
 * turns the manifest + `DISABLED_DOMAINS` into the AppModule imports list.
 */
export const DOMAIN_MODULES: Record<DomainKey, Type<unknown>[]> = {
    accounting: [AccountingModule],
    'ai-agent': [AiAgentModule],
    audit: [AuditModule],
    catalog: [CatalogModule],
    'custom-fields': [CustomFieldsModule],
    files: [FilesModule],
    identity: [AuthModule, TenantsModule, SettingsModule, UsersModule, OnboardingModule, BusinessSetupModule, PermissionsModule],
    inventory: [InventoryModule, StockLedgerModule, StockCountsModule],
    invoicing: [InvoicingModule],
    parties: [PartiesModule],
    platform: [CodeSequencesModule],
    reports: [ReportsModule],
};

export function enabledModuleImports(rawDisabled: string | undefined): Type<unknown>[] {
    return resolveEnabledDomains(rawDisabled).enabled.flatMap((key) => DOMAIN_MODULES[key]);
}
