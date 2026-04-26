import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto/warehouse.dto';

@Injectable()
export class WarehousesService {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(tenantId: string) {
        return this.prisma.warehouse.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findById(tenantId: string, id: string) {
        const warehouse = await this.prisma.warehouse.findFirst({
            where: { id, tenantId },
        });
        if (!warehouse) {
            throw new NotFoundException('Warehouse not found');
        }
        return warehouse;
    }

    async create(tenantId: string, dto: CreateWarehouseDto) {
        const existing = await this.prisma.warehouse.findFirst({
            where: { tenantId, code: dto.code },
        });
        if (existing) {
            throw new ConflictException('Warehouse with this code already exists');
        }

        return this.prisma.warehouse.create({
            data: {
                tenantId,
                ...dto,
            },
        });
    }

    async update(tenantId: string, id: string, dto: UpdateWarehouseDto) {
        await this.findById(tenantId, id);

        if (dto.code) {
            const existing = await this.prisma.warehouse.findFirst({
                where: { tenantId, code: dto.code, id: { not: id } },
            });
            if (existing) {
                throw new ConflictException('Warehouse with this code already exists');
            }
        }

        return this.prisma.warehouse.update({
            where: { id },
            data: dto,
        });
    }
}
