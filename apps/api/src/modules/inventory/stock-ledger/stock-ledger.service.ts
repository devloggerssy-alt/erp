import { Injectable } from '@nestjs/common';
import { StockLedgerRepository, StockMovementFilters } from './repositories/stock-ledger.repository';
import { StockMovementPresenter } from './presenters/stock-movement.presenter';

@Injectable()
export class StockLedgerService {
    constructor(
        private readonly stockLedgerRepository: StockLedgerRepository,
        private readonly stockMovementPresenter: StockMovementPresenter,
    ) {}

    async findMovements(tenantId: string, filters: StockMovementFilters) {
        const result = await this.stockLedgerRepository.findMovements(tenantId, filters);
        return {
            data: this.stockMovementPresenter.toResponseList(result.data as any),
            total: result.total,
            page: result.page,
            limit: result.limit,
        };
    }
}
