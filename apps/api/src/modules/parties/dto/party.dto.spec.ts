import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePartyDto, UpdatePartyDto } from './party.dto';

const PIPE_OPTIONS = { whitelist: true, forbidNonWhitelisted: true };

describe('Party DTOs — dashboard payload shape', () => {
    it('accepts a create payload with receivable/payable account overrides', async () => {
        const payload = {
            code: 'SUP-1',
            name: 'شركة النور',
            type: 'SUPPLIER',
            phone: '0957833',
            receivableAccountId: 'cce03705-f7b6-4da6-959a-630d4870a492',
            payableAccountId: 'd914a93c-0cda-4075-8be5-a356b5e51d2d',
        };

        const errors = await validate(plainToInstance(CreatePartyDto, payload), PIPE_OPTIONS);

        expect(errors).toHaveLength(0);
    });

    it('accepts an update payload clearing the account overrides with null', async () => {
        const payload = { receivableAccountId: null, payableAccountId: null };

        const errors = await validate(plainToInstance(UpdatePartyDto, payload), PIPE_OPTIONS);

        expect(errors).toHaveLength(0);
    });

    it('still rejects properties that are not part of the DTO', async () => {
        const payload = { name: 'Test', type: 'CUSTOMER', unexpected: true };

        const errors = await validate(plainToInstance(CreatePartyDto, payload), PIPE_OPTIONS);

        expect(errors).toHaveLength(1);
        expect(errors[0]?.property).toBe('unexpected');
    });
});
