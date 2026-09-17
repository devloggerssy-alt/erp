import { Injectable } from '@nestjs/common';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { OpeningCashService } from '../../../accounting/opening-balances/services/opening-cash.service';
import { validateArrayAs } from '../utils/validate-payload.util';
import type { SetupTaskHandler, SetupTaskHandlerResult } from './setup-task-handler.interface';

class OpeningCashLineDto {
    @IsString() @IsNotEmpty()
    cashboxId: string = '';

    @IsString() @IsNotEmpty()
    currencyId: string = '';

    @IsNumber()
    amount: number = 0;

    @IsOptional() @IsNumber()
    exchangeRate?: number;

    @IsString() @IsNotEmpty()
    fiscalPeriodId: string = '';

    @IsOptional() @IsString()
    description?: string;
}

@Injectable()
export class OpeningCashBalancesTaskHandler implements SetupTaskHandler {
    constructor(
        private readonly openingCashService: OpeningCashService,
        private readonly prisma: PrismaService,
    ) {}

    async execute(tenantId: string, userId: string, payload: unknown): Promise<SetupTaskHandlerResult> {
        const lines = await validateArrayAs(OpeningCashLineDto, payload);

        let posted = 0;
        for (const line of lines) {
            const alreadyPosted = await this.prisma.journalLine.findFirst({
                where: { tenantId, cashboxId: line.cashboxId, journalEntry: { referenceType: 'OPENING_BALANCE' } },
            });
            if (alreadyPosted) continue;

            await this.openingCashService.post(tenantId, userId, {
                cashboxId: line.cashboxId,
                currencyId: line.currencyId,
                amount: line.amount,
                exchangeRate: line.exchangeRate,
                fiscalPeriodId: line.fiscalPeriodId,
                description: line.description,
            });
            posted += 1;
        }

        return { completed: true, details: { posted } };
    }
}
