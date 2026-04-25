import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CreateItemCategoryDto, UpdateItemCategoryDto } from './dto';

@Injectable()
export class ItemCategoriesService {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(tenantId: string) {
        const data = await this.prisma.itemCategory.findMany({
            where: { tenantId },
            include: {
                parent: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return { data };
    }

    async findById(tenantId: string, id: string) {
        const category = await this.prisma.itemCategory.findFirst({
            where: { id, tenantId },
            include: {
                parent: true,
                children: true,
            },
        });

        if (!category) {
            throw new NotFoundException('Category not found');
        }

        return category;
    }

    async create(tenantId: string, dto: CreateItemCategoryDto) {
        const existing = await this.prisma.itemCategory.findFirst({
            where: { tenantId, name: dto.name },
        });

        if (existing) {
            throw new ConflictException('Category with this name already exists');
        }

        if (dto.parentId) {
            await this.findById(tenantId, dto.parentId);
        }

        return this.prisma.itemCategory.create({
            data: {
                tenantId,
                ...dto,
            },
        });
    }

    async update(tenantId: string, id: string, dto: UpdateItemCategoryDto) {
        await this.findById(tenantId, id);

        if (dto.name) {
            const existing = await this.prisma.itemCategory.findFirst({
                where: { tenantId, name: dto.name, id: { not: id } },
            });

            if (existing) {
                throw new ConflictException('Category with this name already exists');
            }
        }

        if (dto.parentId) {
            if (dto.parentId === id) {
                throw new ConflictException('Category cannot be its own parent');
            }
            await this.findById(tenantId, dto.parentId);
        }

        return this.prisma.itemCategory.update({
            where: { id },
            data: dto,
        });
    }
}
