import { Injectable, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrudService } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { Item } from '@devloggers/db-prisma';
import { ItemsRepository } from '../repositories/items.repository';
import { ItemPresenter } from '../presenters/item.presenter';
import { CreateItemDto, UpdateItemDto, ItemResponseDto } from '../dto';

@Injectable()
export class ItemsService extends CrudService<Item, ItemResponseDto, CreateItemDto, UpdateItemDto> {
    protected readonly resourceName = resources.items.key;

    constructor(
        private readonly itemsRepository: ItemsRepository,
        private readonly itemPresenter: ItemPresenter,
        private readonly emitter: EventEmitter2,
    ) {
        super(itemsRepository, itemPresenter, emitter);
    }

    protected override async beforeCreate(tenantId: string, dto: CreateItemDto): Promise<void> {
        const taken = await this.itemsRepository.isCodeTaken(tenantId, dto.code);
        if (taken) {
            throw new ConflictException(`An item with code "${dto.code}" already exists`);
        }
    }

    protected override async beforeUpdate(
        tenantId: string,
        id: string,
        dto: UpdateItemDto,
    ): Promise<void> {
        if (dto.code) {
            const taken = await this.itemsRepository.isCodeTaken(tenantId, dto.code, id);
            if (taken) {
                throw new ConflictException(`An item with code "${dto.code}" already exists`);
            }
        }
    }
}
