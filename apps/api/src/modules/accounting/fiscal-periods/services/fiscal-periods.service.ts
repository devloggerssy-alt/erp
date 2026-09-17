import { Injectable, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrudService } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { FiscalPeriod } from '@devloggers/db-prisma';
import { FiscalPeriodsRepository } from '../repositories/fiscal-periods.repository';
import { FiscalPeriodPresenter } from '../presenters/fiscal-period.presenter';
import { CreateFiscalPeriodDto, UpdateFiscalPeriodDto, FiscalPeriodResponseDto } from '../dto';
import { AuditWriter, SYSTEM_USER_ID } from '../../../audit/audit-writer.service';
import { RequestContext } from '../../../../common/request-context/request-context';

@Injectable()
export class FiscalPeriodsService extends CrudService<FiscalPeriod, FiscalPeriodResponseDto, CreateFiscalPeriodDto, UpdateFiscalPeriodDto> {
    protected readonly resourceName = resources.fiscalPeriods.key;

    constructor(
        private readonly fiscalPeriodsRepository: FiscalPeriodsRepository,
        private readonly fiscalPeriodPresenter: FiscalPeriodPresenter,
        private readonly emitter: EventEmitter2,
        private readonly audit: AuditWriter,
    ) {
        super(fiscalPeriodsRepository, fiscalPeriodPresenter, emitter);
    }

    protected override async beforeCreate(tenantId: string, dto: CreateFiscalPeriodDto): Promise<void> {
        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);

        if (endDate <= startDate) {
            throw new BadRequestException('End date must be after start date');
        }

        const overlapping = await this.fiscalPeriodsRepository.findOverlapping(tenantId, startDate, endDate);
        if (overlapping) {
            throw new BadRequestException(`Overlaps with existing period: ${overlapping.name}`);
        }
    }

    protected override async beforeUpdate(
        tenantId: string,
        id: string,
        _dto: UpdateFiscalPeriodDto,
    ): Promise<void> {
        const period = await this.fiscalPeriodsRepository.findById(tenantId, id);

        if (period?.status === 'LOCKED') {
            throw new BadRequestException('Locked fiscal periods cannot be modified');
        }
    }

    /**
     * Phase 7.2.1 — period status transitions are always audited. Best-effort
     * (plan deviation 3): CrudService.update runs no transaction to join.
     */
    protected override async onUpdated(tenantId: string, entity: FiscalPeriod, previous: FiscalPeriod): Promise<void> {
        if (entity.status === previous.status) return;
        await this.audit.record({
            tenantId,
            userId: RequestContext.get()?.userId ?? SYSTEM_USER_ID,
            action: entity.status === 'OPEN' ? 'PERIOD_REOPENED' : `PERIOD_${entity.status}`,
            entityType: 'fiscal_period',
            entityId: entity.id,
            source: 'GL',
            oldValues: { status: previous.status },
            newValues: { status: entity.status },
        });
    }
}
