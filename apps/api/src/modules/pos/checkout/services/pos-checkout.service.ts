import { Injectable, BadRequestException } from '@nestjs/common';
import { SalesCheckoutFacade } from '../../../invoicing';
import { PosSettingsService } from '../../settings/services/pos-settings.service';
import type { CreatePosCheckoutDto, PosCheckoutResponseDto } from '../dto';

@Injectable()
export class PosCheckoutService {
    constructor(
        private readonly settings: PosSettingsService,
        private readonly checkoutFacade: SalesCheckoutFacade,
    ) {}

    async checkout(tenantId: string, userId: string, dto: CreatePosCheckoutDto): Promise<PosCheckoutResponseDto> {
        const setting = await this.settings.get(tenantId);
        if (!setting) {
            throw new BadRequestException('POS is not set up for this tenant. An admin must provision it first.');
        }

        const result = await this.checkoutFacade.checkout({
            tenantId,
            userId,
            clientRequestId: dto.clientRequestId,
            invoiceTypeId: setting.invoiceTypeId,
            partyId: dto.partyId ?? setting.defaultPartyId,
            warehouseId: setting.warehouseId,
            cashboxId: setting.cashboxId,
            lines: dto.lines,
            notes: dto.notes,
            minimumTender: dto.tendered,
        });

        return {
            invoiceId: result.invoiceId,
            invoiceNumber: result.invoiceNumber,
            paymentId: result.paymentId,
            paymentNumber: result.paymentNumber,
            total: result.total,
            tendered: dto.tendered,
            change: dto.tendered - result.total,
            date: result.date.toISOString(),
            replayed: result.replayed,
        };
    }
}
