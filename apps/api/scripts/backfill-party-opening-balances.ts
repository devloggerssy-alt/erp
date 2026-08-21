/**
 * One-shot data migration (Phase 3 task 3.4.3 / ADR-3): converts legacy
 * Party.openingBalance > 0 into POSTED+LOCKED OpeningBalanceSession records with a
 * single PARTY line, posting the JE through the real AccountingPostingFacade.
 *
 * MUST run BEFORE the prisma migration that drops parties.opening_balance.
 *
 *   pnpm --filter @devloggers/api backfill:party-openings              # migrate
 *   pnpm --filter @devloggers/api backfill:party-openings -- --dry-run  # detector
 *
 * Exits non-zero when any party could not be migrated (missing fiscal period, base
 * currency, or financial settings) — the column must NOT be dropped then.
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { AppModule } from '../src/app.module';
import { OpeningBalanceSessionsService } from '../src/modules/accounting/opening-balances/sessions/opening-balance-sessions.service';

const DRY_RUN = process.argv.includes('--dry-run');

interface BlockedParty {
    tenantId: string;
    partyId: string;
    code: string | null;
    name: string;
    openingBalance: number;
}

async function main(): Promise<void> {
    const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    const prisma = app.get(PrismaService);
    const sessions = app.get(OpeningBalanceSessionsService);

    const tenants = await prisma.tenant.findMany({ select: { id: true } });
    let migrated = 0;
    const blocked: BlockedParty[] = [];

    for (const { id: tenantId } of tenants) {
        const parties = await prisma.party.findMany({
            where: { tenantId, openingBalance: { gt: 0 } },
            select: { id: true, code: true, name: true, type: true, openingBalance: true },
        });
        if (parties.length === 0) continue;

        const covered = await prisma.openingBalanceSessionLine.findMany({
            where: { tenantId, partyId: { in: parties.map((p) => p.id) } },
            select: { partyId: true },
        });
        const coveredPartyIds = new Set(covered.map((l) => l.partyId));

        const openPeriod = await prisma.fiscalPeriod.findFirst({
            where: { tenantId, status: 'OPEN' },
            orderBy: { startDate: 'asc' },
            select: { id: true, status: true, startDate: true },
        });
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { baseCurrencyId: true },
        });

        if (openPeriod && tenant?.baseCurrencyId) {
            await prisma.documentSequence.upsert({
                where: { tenantId_documentType: { tenantId, documentType: 'OPENING_BALANCE' } },
                create: { tenantId, documentType: 'OPENING_BALANCE', prefix: 'OB', padding: 5 },
                update: {},
            });
        }

        for (const party of parties) {
            if (coveredPartyIds.has(party.id)) continue;
            const partySide = party.type === 'CUSTOMER' ? 'AR' : 'AP';
            const entry: BlockedParty = {
                tenantId,
                partyId: party.id,
                code: party.code,
                name: party.name,
                openingBalance: Number(party.openingBalance),
            };

            if (!openPeriod || !tenant?.baseCurrencyId) {
                console.log(
                    `[blocked] tenant=${tenantId} party=${party.code ?? party.id} — no open fiscal period or base currency`,
                );
                blocked.push(entry);
                continue;
            }

            if (DRY_RUN) {
                console.log(
                    `[dry-run] tenant=${tenantId} party=${party.code ?? party.id} openingBalance=${entry.openingBalance} side=${partySide}`,
                );
                blocked.push(entry);
                continue;
            }

            try {
                const created = await sessions.createAs(tenantId, 'backfill', {
                    fiscalPeriodId: openPeriod.id,
                    description: `Migrated Party.openingBalance (${party.code ?? party.id})`,
                    lines: [
                        {
                            dimension: 'PARTY',
                            partyId: party.id,
                            partySide,
                            currencyId: tenant.baseCurrencyId,
                            amount: entry.openingBalance,
                            exchangeRate: 1,
                        },
                    ],
                });
                await sessions.validate(tenantId, created.id);
                await sessions.review(tenantId, created.id);
                await sessions.post(tenantId, created.id, 'backfill');
                await sessions.lock(tenantId, created.id, 'backfill');
                migrated += 1;
                console.log(`[migrated] tenant=${tenantId} party=${party.code ?? party.id} session=${created.number}`);
            } catch (error) {
                console.error(
                    `[failed] tenant=${tenantId} party=${party.code ?? party.id}: ${error instanceof Error ? error.message : String(error)}`,
                );
                blocked.push(entry);
            }
        }
    }

    console.log(`Backfill done. migrated=${migrated} blocked=${blocked.length}`);
    if (blocked.length > 0) {
        console.table(blocked);
        if (!DRY_RUN) {
            console.error(
                'Some parties could not be migrated (missing fiscal period, base currency, or financial settings). ' +
                'Resolve them before running the migration that drops parties.opening_balance.',
            );
            await app.close();
            process.exit(1);
        }
    }
    await app.close();
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});