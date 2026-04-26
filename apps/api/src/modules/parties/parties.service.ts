import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CreatePartyDto, UpdatePartyDto } from './dto';

@Injectable()
export class PartiesService {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(tenantId: string, type?: 'CUSTOMER' | 'SUPPLIER' | 'CUSTOMER_SUPPLIER', page = 1, limit = 50) {
        const offset = (page - 1) * limit;

        const where: any = { tenantId };
        if (type) {
            where.type = type;
        }

        const [data, total] = await Promise.all([
            this.prisma.party.findMany({
                where,
                skip: offset,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.party.count({ where }),
        ]);

        return { data, total, page, limit };
    }

    async findById(tenantId: string, id: string) {
        const party = await this.prisma.party.findFirst({
            where: { id, tenantId },
        });

        if (!party) {
            throw new NotFoundException('Party not found');
        }

        return party;
    }

    async create(tenantId: string, dto: CreatePartyDto) {
        if (dto.code) {
            const existing = await this.prisma.party.findFirst({
                where: { tenantId, code: dto.code },
            });

            if (existing) {
                throw new ConflictException('Party with this code already exists');
            }
        }

        return this.prisma.party.create({
            data: {
                tenantId,
                ...dto,
            },
        });
    }

    async update(tenantId: string, id: string, dto: UpdatePartyDto) {
        await this.findById(tenantId, id);

        if (dto.code) {
            const existing = await this.prisma.party.findFirst({
                where: { tenantId, code: dto.code, id: { not: id } },
            });

            if (existing) {
                throw new ConflictException('Party with this code already exists');
            }
        }

        return this.prisma.party.update({
            where: { id },
            data: dto,
        });
    }

    async updateStatus(tenantId: string, id: string, isActive: boolean) {
        await this.findById(tenantId, id);

        return this.prisma.party.update({
            where: { id },
            data: { isActive },
        });
    }
}
