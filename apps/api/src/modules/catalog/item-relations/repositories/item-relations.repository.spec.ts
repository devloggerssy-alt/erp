import { Test } from '@nestjs/testing';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { ItemRelationsRepository } from './item-relations.repository';

const RELATED_ITEM_LOAD = { relatedItem: { select: { id: true, name: true, code: true } } };

describe('ItemRelationsRepository — related item is loaded on every returned row', () => {
    const prisma = {
        itemRelation: {
            create: jest.fn().mockResolvedValue({}),
            update: jest.fn().mockResolvedValue({}),
        },
    };

    let repository: ItemRelationsRepository;

    beforeEach(async () => {
        jest.clearAllMocks();
        const moduleRef = await Test.createTestingModule({
            providers: [ItemRelationsRepository, { provide: PrismaService, useValue: prisma }],
        }).compile();

        repository = moduleRef.get(ItemRelationsRepository);
    });

    it('create() loads the related item so the presenter can respond', async () => {
        await repository.create({ tenantId: 't1', itemId: 'i1', relatedItemId: 'i2', relationType: 'ACCESSORY' });

        expect(prisma.itemRelation.create).toHaveBeenCalledWith(
            expect.objectContaining({ include: RELATED_ITEM_LOAD }),
        );
    });

    it('update() loads the related item so the presenter can respond', async () => {
        await repository.update('r1', { notes: 'x' });

        expect(prisma.itemRelation.update).toHaveBeenCalledWith(
            expect.objectContaining({ include: RELATED_ITEM_LOAD }),
        );
    });
});
