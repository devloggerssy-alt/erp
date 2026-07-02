import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import type { FinanceResetResultDto, InventoryResetResultDto } from '../dto/data-reset.dto';

/**
 * Destructive, tenant-scoped bulk deletion of transactional data.
 *
 * Each reset runs inside a single transaction so a failure leaves the tenant's
 * data untouched. Master data (parties, items, accounts, cashboxes, currencies,
 * fiscal periods, sequences) is preserved — only movements/documents are wiped
 * and denormalized balances are zeroed.
 */
@Injectable()
export class DataResetService {
    private readonly logger = new Logger(DataResetService.name);

    constructor(private readonly prisma: PrismaService) {}

    /**
     * Deletes all financial documents (payments, invoices, expenses, journal
     * entries) and zeroes denormalized cashbox / GL account balances.
     */
    async resetFinance(tenantId: string): Promise<FinanceResetResultDto> {
        const result = await this.prisma.$transaction(async (tx) => {
            // Allocations link payments ↔ invoices; remove them before their parents.
            const paymentAllocations = await tx.paymentAllocation.deleteMany({ where: { tenantId } });
            const payments = await tx.payment.deleteMany({ where: { tenantId } });
            // Invoice lines / expense items / journal lines cascade with their parent.
            const invoices = await tx.invoice.deleteMany({ where: { tenantId } });
            const expenses = await tx.expense.deleteMany({ where: { tenantId } });
            const journalEntries = await tx.journalEntry.deleteMany({ where: { tenantId } });
            // Zero the denormalized balances that the deleted documents fed.
            const cashboxesReset = await tx.cashbox.updateMany({ where: { tenantId }, data: { balance: 0 } });
            const accountsReset = await tx.chartOfAccount.updateMany({ where: { tenantId }, data: { currentBalance: 0 } });

            return {
                paymentAllocations: paymentAllocations.count,
                payments: payments.count,
                invoices: invoices.count,
                expenses: expenses.count,
                journalEntries: journalEntries.count,
                cashboxesReset: cashboxesReset.count,
                accountsReset: accountsReset.count,
            };
        });

        this.logger.warn(`Finance reset for tenant ${tenantId}: ${JSON.stringify(result)}`);
        return result;
    }

    /**
     * Deletes all inventory records (stock movements, stock counts, and the
     * denormalized stock balance projection).
     */
    async resetInventory(tenantId: string): Promise<InventoryResetResultDto> {
        const result = await this.prisma.$transaction(async (tx) => {
            const stockMovements = await tx.stockMovement.deleteMany({ where: { tenantId } });
            // Stock count lines cascade with their parent stock count.
            const stockCounts = await tx.stockCount.deleteMany({ where: { tenantId } });
            const stockBalances = await tx.stockBalance.deleteMany({ where: { tenantId } });

            return {
                stockMovements: stockMovements.count,
                stockCounts: stockCounts.count,
                stockBalances: stockBalances.count,
            };
        });

        this.logger.warn(`Inventory reset for tenant ${tenantId}: ${JSON.stringify(result)}`);
        return result;
    }
}
