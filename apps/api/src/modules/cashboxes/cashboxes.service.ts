import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CreateCashboxDto, UpdateCashboxDto } from './dto';

@Injectable()
export class CashboxesService {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(tenantId: string) {
        return this.prisma.cashbox.findMany({
            where: { tenantId },
            include: { currency: { select: { code: true, symbol: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findById(tenantId: string, id: string) {
        const cashbox = await this.prisma.cashbox.findFirst({
            where: { id, tenantId },
            include: { currency: { select: { code: true, symbol: true } } },
        });
        if (!cashbox) throw new NotFoundException('Cashbox not found');
        return cashbox;
    }

    async create(tenantId: string, dto: CreateCashboxDto) {
        const existing = await this.prisma.cashbox.findFirst({ where: { tenantId, code: dto.code } });
        if (existing) throw new ConflictException('Cashbox with this code already exists');
        return this.prisma.cashbox.create({ data: { tenantId, ...dto } });
    }

    async update(tenantId: string, id: string, dto: UpdateCashboxDto) {
        await this.findById(tenantId, id);
        return this.prisma.cashbox.update({ where: { id }, data: dto });
    }
}
