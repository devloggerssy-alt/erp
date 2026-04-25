import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CreateUnitDto, UpdateUnitDto } from './dto';

@Injectable()
export class UnitsService {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(tenantId: string) {
        const data = await this.prisma.unit.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
        });

        return { data };
    }

    async findById(tenantId: string, id: string) {
        const unit = await this.prisma.unit.findFirst({
            where: { id, tenantId },
        });

        if (!unit) {
            throw new NotFoundException('Unit not found');
        }

        return unit;
    }

    async create(tenantId: string, dto: CreateUnitDto) {
        const existing = await this.prisma.unit.findFirst({
            where: { tenantId, name: dto.name },
        });

        if (existing) {
            throw new ConflictException('Unit with this name already exists');
        }

        return this.prisma.unit.create({
            data: {
                tenantId,
                ...dto,
            },
        });
    }

    async update(tenantId: string, id: string, dto: UpdateUnitDto) {
        await this.findById(tenantId, id);

        if (dto.name) {
            const existing = await this.prisma.unit.findFirst({
                where: { tenantId, name: dto.name, id: { not: id } },
            });

            if (existing) {
                throw new ConflictException('Unit with this name already exists');
            }
        }

        return this.prisma.unit.update({
            where: { id },
            data: dto,
        });
    }
}
