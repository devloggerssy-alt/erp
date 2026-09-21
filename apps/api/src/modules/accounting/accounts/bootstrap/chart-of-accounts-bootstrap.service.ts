import { Injectable } from '@nestjs/common';
import { AccountsService } from '../services/accounts.service';
import type { AccountTypeEnum } from '../dto';
import { CHART_OF_ACCOUNTS_TEMPLATE } from './chart-of-accounts-template';

/**
 * Narrow, non-GL-policy facade over AccountsService — exposed outside the
 * accounting domain (accounts/bootstrap is not in the accounts GL-internal
 * re-ban list, see eslint/domain-boundaries.mjs) so identity/business-setup
 * can bootstrap a default CoA without reaching into accounts/services
 * (JournalPostingService lives there and must stay domain-internal).
 */
@Injectable()
export class ChartOfAccountsBootstrapService {
    constructor(private readonly accountsService: AccountsService) {}

    async bootstrapDefaultTemplate(tenantId: string): Promise<Record<string, string>> {
        const existing = await this.accountsService.list(tenantId, { take: 1000 });
        const codeToId: Record<string, string> = Object.fromEntries(
            existing.data.map((account) => [account.code, account.id]),
        );

        const parentCodes = new Set(
            CHART_OF_ACCOUNTS_TEMPLATE.map((entry) => entry.parentCode).filter((code): code is string => !!code),
        );

        for (const entry of CHART_OF_ACCOUNTS_TEMPLATE) {
            if (codeToId[entry.code]) continue;
            const isParent = parentCodes.has(entry.code);
            const created = await this.accountsService.create(tenantId, {
                code: entry.code,
                name: { ar: entry.nameAr, en: entry.nameEn },
                type: entry.type as unknown as AccountTypeEnum,
                parentId: entry.parentCode ? codeToId[entry.parentCode] : undefined,
                isPostable: !isParent,
                isContra: entry.code === '1220',
            });
            codeToId[entry.code] = created.id;
        }

        return codeToId;
    }

    async resolveIdsByCode(tenantId: string, codes: string[]): Promise<Record<string, string>> {
        const { data } = await this.accountsService.list(tenantId, { take: codes.length, where: { code: { in: codes } } });
        return Object.fromEntries(data.map((account) => [account.code, account.id]));
    }
}
