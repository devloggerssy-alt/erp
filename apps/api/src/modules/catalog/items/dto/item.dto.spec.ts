import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ITEM_TYPES } from '@devloggers/api-contracts';
import { CreateItemDto, UpdateItemDto } from './item.dto';

const CREATE_BASE = { code: 'SKU-1', name: 'Widget', categoryId: 'c1', baseUnitId: 'u1' };

describe('item DTO item-type catalog', () => {
    it('accepts every stored type on create', async () => {
        for (const itemType of ITEM_TYPES) {
            const errors = await validate(plainToInstance(CreateItemDto, { ...CREATE_BASE, itemType }));
            expect(errors).toHaveLength(0);
        }
    });

    it('accepts every stored type on update', async () => {
        for (const itemType of ITEM_TYPES) {
            const errors = await validate(plainToInstance(UpdateItemDto, { itemType }));
            expect(errors).toHaveLength(0);
        }
    });

    it('rejects values the database cannot store', async () => {
        for (const unsupported of ['bundle', 'vehicle']) {
            const createErrors = await validate(
                plainToInstance(CreateItemDto, { ...CREATE_BASE, itemType: unsupported }),
            );
            expect(createErrors.some((error) => error.property === 'itemType')).toBe(true);

            const updateErrors = await validate(plainToInstance(UpdateItemDto, { itemType: unsupported }));
            expect(updateErrors.some((error) => error.property === 'itemType')).toBe(true);
        }
    });
});
