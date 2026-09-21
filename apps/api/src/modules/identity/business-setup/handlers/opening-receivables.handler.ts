import { Injectable } from '@nestjs/common';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { PartyOpeningBalanceService } from '../../../accounting/opening-balances/services/party-opening-balance.service';
import { validateArrayAs } from '../utils/validate-payload.util';
import type { SetupTaskHandler, SetupTaskHandlerResult } from './setup-task-handler.interface';

class OpeningPartyLineDto {
    @IsString() @IsNotEmpty()
    partyId: string = '';

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
export class OpeningReceivablesTaskHandler implements SetupTaskHandler {
    constructor(
        private readonly partyOpeningBalanceService: PartyOpeningBalanceService,
        private readonly prisma: PrismaService,
    ) {}

    async execute(tenantId: string, userId: string, payload: unknown): Promise<SetupTaskHandlerResult> {
        const lines = await validateArrayAs(OpeningPartyLineDto, payload);

        let posted = 0;
        for (const line of lines) {
            const alreadyPosted = await this.prisma.journalLine.findFirst({
                where: { tenantId, partyId: line.partyId, journalEntry: { referenceType: 'OPENING_BALANCE' } },
            });
            if (alreadyPosted) continue;

            await this.partyOpeningBalanceService.post(tenantId, userId, {
                partyId: line.partyId,
                partySide: 'AR',
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
