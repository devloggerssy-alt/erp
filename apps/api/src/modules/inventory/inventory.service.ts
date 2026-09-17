import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { PostOpeningBalanceDto } from './dto/inventory.dto';
import { InventoryRepository } from './repositories/inventory.repository';
import { InventoryPresenter } from './presenters/inventory.presenter';
import { InventoryMovementFacade } from './movements';
import { AccountingPostingFacade, type OpeningStockPostedIntent, type PrismaTransactionClient } from '../accounting/posting';
import { assertFiscalPeriodOpen } from '../accounting/accounts/utils/assert-period-open';

@Injectable()
export class InventoryService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly inventoryRepository: InventoryRepository,
        private readonly inventoryPresenter: InventoryPresenter,
        private readonly postingFacade: AccountingPostingFacade,
        private readonly movements: InventoryMovementFacade,
    ) {}

    async registerOpeningStockTx(
        tx: PrismaTransactionClient,
        params: {
            tenantId: string;
            userId: string;
            warehouseId: string;
            fiscalPeriodId: string;
            fiscalPeriodStatus?: string | undefined;
            items: { itemId: string; quantity: number; unitCost: number }[];
        },
    ): Promise<{ count: number; journalEntryId: string | null }> {
        const totalValue = params.items.reduce((s, it) => s + it.quantity * it.unitCost, 0);

        await this.movements.apply(tx, {
            kind: 'OPENING_STOCK',
            tenantId: params.tenantId,
            userId: params.userId,
            fiscalPeriodId: params.fiscalPeriodId,
            warehouseId: params.warehouseId,
            lines: params.items,
        });

        let journalEntryId: string | null = null;
        if (totalValue !== 0) {
            const intent: OpeningStockPostedIntent = {
                kind: 'OPENING_STOCK_POSTED',
                tenantId: params.tenantId,
                userId: params.userId,
                date: new Date(),
                fiscalPeriodId: params.fiscalPeriodId,
                fiscalPeriodStatus: params.fiscalPeriodStatus,
                exchangeRate: 1,
                referenceId: params.warehouseId,
                description: 'Opening inventory balance',
                totalValue,
            };
            const result = await this.postingFacade.record(tx, intent);
            journalEntryId = result.journalEntryId;
        }

        return { count: params.items.length, journalEntryId };
    }

    async registerOpeningBalance(tenantId: string, userId: string, dto: PostOpeningBalanceDto) {
        const period = await this.prisma.fiscalPeriod.findFirst({
            where: { id: dto.fiscalPeriodId, tenantId },
            select: { status: true },
        });
        assertFiscalPeriodOpen(period?.status);

        return this.prisma.$transaction((tx) =>
            this.registerOpeningStockTx(tx, {
                tenantId,
                userId,
                warehouseId: dto.warehouseId,
                fiscalPeriodId: dto.fiscalPeriodId,
                fiscalPeriodStatus: period?.status,
                items: dto.items,
            }),
        );
    }

    async getBalances(tenantId: string, filters: { warehouseId?: string; itemId?: string }) {
        const balances = await this.inventoryRepository.getBalances(tenantId, filters);
        return this.inventoryPresenter.toResponseList(balances);
    }
}
