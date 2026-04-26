import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CreateItemDto, UpdateItemDto } from './dto';

@Injectable()
export class ItemsService {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(tenantId: string, page = 1, limit = 50) {
        const offset = (page - 1) * limit;

        const [data, total] = await Promise.all([
            this.prisma.item.findMany({
                where: { tenantId },
                include: {
                    category: true,
                    baseUnit: true,
                },
                skip: offset,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.item.count({ where: { tenantId } }),
        ]);

        return { data, total, page, limit };
    }

    async findById(tenantId: string, id: string) {
        const item = await this.prisma.item.findFirst({
            where: { id, tenantId },
            include: {
                category: true,
                baseUnit: true,
            },
        });

        if (!item) {
            throw new NotFoundException('Item not found');
        }

        return item;
    }

    async create(tenantId: string, dto: CreateItemDto) {
        const existing = await this.prisma.item.findFirst({
            where: { tenantId, code: dto.code },
        });

        if (existing) {
            throw new ConflictException('Item with this code already exists');
        }

        return this.prisma.item.create({
            data: {
                tenantId,
                ...dto,
            },
        });
    }

    async update(tenantId: string, id: string, dto: UpdateItemDto) {
        await this.findById(tenantId, id);

        if (dto.code) {
            const existing = await this.prisma.item.findFirst({
                where: { tenantId, code: dto.code, id: { not: id } },
            });

            if (existing) {
                throw new ConflictException('Item with this code already exists');
            }
        }

        return this.prisma.item.update({
            where: { id },
            data: dto,
        });
    }

    async updateStatus(tenantId: string, id: string, isActive: boolean) {
        await this.findById(tenantId, id);

        return this.prisma.item.update({
            where: { id },
            data: { isActive },
        });
    }
}
