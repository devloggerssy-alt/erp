import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CreateInvoiceTypeDto, UpdateInvoiceTypeDto } from './dto';

@Injectable()
export class InvoiceTypesService {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(tenantId: string) {
        return this.prisma.invoiceType.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findById(tenantId: string, id: string) {
        const type = await this.prisma.invoiceType.findFirst({
            where: { id, tenantId },
        });
        if (!type) {
            throw new NotFoundException('Invoice type not found');
        }
        return type;
    }

    async create(tenantId: string, dto: CreateInvoiceTypeDto) {
        const existing = await this.prisma.invoiceType.findFirst({
            where: { tenantId, code: dto.code },
        });
        if (existing) {
            throw new ConflictException('Invoice type with this code already exists');
        }

        return this.prisma.invoiceType.create({
            data: {
                tenantId,
                ...dto,
            },
        });
    }

    async update(tenantId: string, id: string, dto: UpdateInvoiceTypeDto) {
        await this.findById(tenantId, id);

        return this.prisma.invoiceType.update({
            where: { id },
            data: dto,
        });
    }
}
