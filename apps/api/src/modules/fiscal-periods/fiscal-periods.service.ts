import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CreateFiscalPeriodDto, UpdateFiscalPeriodDto } from './dto';

@Injectable()
export class FiscalPeriodsService {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(tenantId: string) {
        return this.prisma.fiscalPeriod.findMany({
            where: { tenantId },
            orderBy: { startDate: 'desc' },
        });
    }

    async create(tenantId: string, dto: CreateFiscalPeriodDto) {
        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);

        if (endDate <= startDate) {
            throw new BadRequestException('End date must be after start date');
        }

        // Check for overlapping periods
        const overlapping = await this.prisma.fiscalPeriod.findFirst({
            where: {
                tenantId,
                OR: [
                    { startDate: { lte: endDate }, endDate: { gte: startDate } },
                ],
            },
        });

        if (overlapping) {
            throw new BadRequestException(
                `Overlaps with existing period: ${overlapping.name}`,
            );
        }

        return this.prisma.fiscalPeriod.create({
            data: {
                tenantId,
                name: dto.name,
                startDate,
                endDate,
            },
        });
    }

    async update(tenantId: string, id: string, dto: UpdateFiscalPeriodDto) {
        const period = await this.prisma.fiscalPeriod.findFirst({
            where: { id, tenantId },
        });
        if (!period) {
            throw new NotFoundException('Fiscal period not found');
        }

        if (period.status === 'LOCKED') {
            throw new BadRequestException('Locked fiscal periods cannot be modified');
        }

        const data: any = {};
        if (dto.name !== undefined) data.name = dto.name;
        if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
        if (dto.endDate !== undefined) data.endDate = new Date(dto.endDate);
        if (dto.status !== undefined) data.status = dto.status;

        return this.prisma.fiscalPeriod.update({
            where: { id },
            data,
        });
    }
}
