import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrudService, FindManyOptions } from '@devloggers/backend-core';
import { customFieldModules, resources } from '@devloggers/api-contracts';
import type { Item } from '@devloggers/db-prisma';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CustomFieldValuesService } from '@/modules/custom-fields';
import { InventoryService } from '@/modules/inventory';
import { CodeSequencesService } from '@/modules/platform';
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
        private readonly codeSequences: CodeSequencesService,
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
                baseUnit: {
                    id: entity.baseUnit.id,
                    name: this.resolveUnitName(entity.baseUnit.name),
                    abbreviation: entity.baseUnit.abbreviation,
                },
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
            baseUnit: {
                id: entity.baseUnit.id,
                name: this.resolveUnitName(entity.baseUnit.name),
                abbreviation: entity.baseUnit.abbreviation,
            },
            brand: entity.brand ?? null,
            customFields,
        };
    }

    private resolveUnitName(name: any): string {
        if (typeof name === 'string') return name;
        if (name && typeof name === 'object' && !Array.isArray(name)) {
            return name.en || name.ar || '';
        }
        return '';
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
            await this.prisma.$transaction((tx) =>
                this.inventoryService.registerOpeningStockTx(tx, {
                    tenantId,
                    userId: openingStock._userId ?? 'system',
                    warehouseId: openingStock.warehouseId,
                    fiscalPeriodId: fiscalPeriod.id,
                    fiscalPeriodStatus: fiscalPeriod.status,
                    items: [
                        { itemId: created.id, quantity: openingStock.quantity, unitCost: openingStock.unitCost ?? 0 },
                    ],
                }),
            );
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
        const code = dto.code?.trim();
        if (code) {
            if (await this.itemsRepository.isCodeTaken(tenantId, code)) {
                throw new ConflictException(`An item with code "${code}" already exists`);
            }
            dto.code = code;
            return;
        }
        dto.code = await this.codeSequences.next(tenantId, 'item', (candidate) =>
            this.itemsRepository.isCodeTaken(tenantId, candidate),
        );
    }
}
