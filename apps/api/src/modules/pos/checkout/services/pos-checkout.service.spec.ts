import { BadRequestException } from '@nestjs/common';
import { PosCheckoutService } from './pos-checkout.service';

function deps() {
    const settings = { get: jest.fn() } as any;
    const checkoutFacade = { checkout: jest.fn() } as any;
    const service = new PosCheckoutService(settings, checkoutFacade);
    return { service, settings, checkoutFacade };
}

const dto = {
    lines: [{ itemId: 'item-1', unitId: 'unit-1', quantity: 1, unitPrice: 100 }],
    tendered: 150,
    clientRequestId: 'req-1',
};

describe('PosCheckoutService.checkout', () => {
    it('rejects checkout when POS is not set up', async () => {
        const { service, settings } = deps();
        settings.get.mockResolvedValue(null);

        await expect(service.checkout('t1', 'u1', dto)).rejects.toThrow(BadRequestException);
    });

    it('defaults to the tenant walk-in party when partyId is omitted', async () => {
        const { service, settings, checkoutFacade } = deps();
        settings.get.mockResolvedValue({
            defaultPartyId: 'party-walkin', invoiceTypeId: 'itype-pos', cashboxId: 'cbx-1', warehouseId: 'wh-1',
        });
        checkoutFacade.checkout.mockResolvedValue({
            invoiceId: 'inv-1', invoiceNumber: 'SAL-00001', paymentId: 'pay-1', paymentNumber: 'REC-00001',
            total: 100, date: new Date('2026-09-25'), replayed: false,
        });

        const result = await service.checkout('t1', 'u1', dto);

        expect(checkoutFacade.checkout).toHaveBeenCalledWith(expect.objectContaining({
            partyId: 'party-walkin', invoiceTypeId: 'itype-pos', cashboxId: 'cbx-1', warehouseId: 'wh-1', minimumTender: 150,
        }));
        expect(result.change).toBe(50);
        expect(result.tendered).toBe(150);
    });

    it('uses the named customer when partyId is provided', async () => {
        const { service, settings, checkoutFacade } = deps();
        settings.get.mockResolvedValue({
            defaultPartyId: 'party-walkin', invoiceTypeId: 'itype-pos', cashboxId: 'cbx-1', warehouseId: 'wh-1',
        });
        checkoutFacade.checkout.mockResolvedValue({
            invoiceId: 'inv-1', invoiceNumber: 'SAL-00001', paymentId: 'pay-1', paymentNumber: 'REC-00001',
            total: 100, date: new Date('2026-09-25'), replayed: false,
        });

        await service.checkout('t1', 'u1', { ...dto, partyId: 'party-named' });

        expect(checkoutFacade.checkout).toHaveBeenCalledWith(expect.objectContaining({ partyId: 'party-named' }));
    });
});
