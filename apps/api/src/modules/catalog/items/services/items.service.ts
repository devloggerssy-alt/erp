import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrudService, FindManyOptions } from '@devloggers/backend-core';
import { customFieldModules, resources } from '@devloggers/api-contracts';
import type { Item } from '@devloggers/db-prisma';
import { StockMovementType } from '@devloggers/db-prisma';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CustomFieldValuesService } from '@/modules/custom-fields/services/custom-field-values.service';
import { InventoryService } from '@/modules/inventory/inventory.service';
import { ItemsRepository } from '../repositories/items.repository';
import { ItemPresenter } from '../presenters/item.presenter';
import { CreateItemDto, UpdateItemDto, ItemResponseDto } from '../dto';

@Injectable()
export class ItemsService extends CrudService<Item, ItemResponseDto, CreateItemDto, UpdateItemDto> {
    protected readonly resourceName = resources.items.key;

    constructor(
        private readonly itemsRepository: ItemsRepository,
        private readonly itemPresenter: ItemPresenter,
        private readonly customFieldValuesService: CustomFieldValuesService,
        private readonly prisma: PrismaService,
        private readonly inventoryService: InventoryService,
        private readonly emitter: EventEmitter2,
    ) {
        super(itemsRepository, itemPresenter, emitter);
    }

    override async list(
        tenantId: string,
        options: FindManyOptions = {},
    ): Promise<{ data: ItemResponseDto[]; total: number }> {
        const result = await this.itemsRepository.findManyWithRelations(tenantId, options);
        const customFieldsByItem = await this.customFieldValuesService.getForEntities(
            tenantId,
            customFieldModules.items,
            result.data.map((item) => item.id),
        );
        return {
            total: result.total,
            data: result.data.map((entity) => ({
                ...this.itemPresenter.toResponse(entity),
                category: entity.category,
                baseUnit: entity.baseUnit,
                customFields: customFieldsByItem[entity.id] ?? {},
            })),
        };
    }

    override async findById(tenantId: string, id: string): Promise<ItemResponseDto> {
        const entity = await this.itemsRepository.findByIdWithRelations(tenantId, id);
        if (!entity) {
            throw new NotFoundException(`${this.resourceName} with id '${id}' not found`);
        }
        const customFields = await this.customFieldValuesService.getForEntity(
            tenantId,
            customFieldModules.items,
            id,
        );
        return {
            ...this.itemPresenter.toResponse(entity),
            category: entity.category,
            baseUnit: entity.baseUnit,
            brand: entity.brand ?? null,
            customFields,
        };
    }

    override async create(tenantId: string, dto: CreateItemDto): Promise<ItemResponseDto> {
        const { customFields, openingStock, ...itemDto } = dto;
        const created = await super.create(tenantId, itemDto as CreateItemDto);
        await this.customFieldValuesService.sync(
            tenantId,
            customFieldModules.items,
            created.id,
            customFields,
        );

        if (openingStock?.warehouseId && openingStock.quantity > 0) {
            const fiscalPeriod = await this.prisma.fiscalPeriod.findFirst({
                where: { tenantId, status: 'OPEN' },
                orderBy: { startDate: 'asc' },
            });
            if (!fiscalPeriod) {
                throw new BadRequestException(
                    'No open fiscal period found. Please create a fiscal period before registering opening stock.',
                );
            }
            await this.inventoryService.postMovement({
                tenantId,
                warehouseId: openingStock.warehouseId,
                itemId: created.id,
                fiscalPeriodId: fiscalPeriod.id,
                movementType: StockMovementType.OPENING,
                quantity: openingStock.quantity,
                unitCost: openingStock.unitCost ?? 0,
                userId: openingStock._userId ?? 'system',
                notes: 'Opening stock registered at item creation',
            });
        }

        return this.findById(tenantId, created.id);
    }

    override async update(tenantId: string, id: string, dto: UpdateItemDto): Promise<ItemResponseDto> {
        const { customFields, ...itemDto } = dto;
        await super.update(tenantId, id, itemDto as UpdateItemDto);
        if (customFields !== undefined) {
            await this.customFieldValuesService.sync(
                tenantId,
                customFieldModules.items,
                id,
                customFields,
            );
        }
        return this.findById(tenantId, id);
    }

    protected override async onDeleted(tenantId: string, entity: Item): Promise<void> {
        await Promise.all([
            this.customFieldValuesService.clearForEntity(tenantId, customFieldModules.items, entity.id),
            this.prisma.tagAssignment.deleteMany({ where: { tenantId, entityType: 'items', entityId: entity.id } }),
        ]);
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
