import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CreateCurrencyDto, UpdateCurrencyDto } from './dto';

@Injectable()
export class CurrenciesService {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(tenantId: string) {
        return this.prisma.currency.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'asc' },
        });
    }

    async create(tenantId: string, dto: CreateCurrencyDto) {
        const existing = await this.prisma.currency.findUnique({
            where: { tenantId_code: { tenantId, code: dto.code } },
        });
        if (existing) {
            throw new ConflictException('Currency code already exists');
        }

        // If marking as base, ensure no other base currency exists
        if (dto.isBase) {
            const existingBase = await this.prisma.currency.findFirst({
                where: { tenantId, isBase: true },
            });
            if (existingBase) {
                throw new BadRequestException(
                    `Base currency already set to ${existingBase.code}. Unset it first.`,
                );
            }
        }

        return this.prisma.currency.create({
            data: {
                tenantId,
                code: dto.code,
                name: dto.name,
                symbol: dto.symbol,
                isBase: dto.isBase ?? false,
            },
        });
    }

    async update(tenantId: string, currencyId: string, dto: UpdateCurrencyDto) {
        const currency = await this.prisma.currency.findFirst({
            where: { id: currencyId, tenantId },
        });
        if (!currency) {
            throw new NotFoundException('Currency not found');
        }

        // If setting as base, clear any other base currency
        if (dto.isBase === true && !currency.isBase) {
            await this.prisma.currency.updateMany({
                where: { tenantId, isBase: true },
                data: { isBase: false },
            });
        }

        return this.prisma.currency.update({
            where: { id: currencyId },
            data: dto,
        });
    }
}
