import { Injectable } from '@nestjs/common';
import { CrudPresenter } from '@devloggers/backend-core';
import type { OpeningBalanceSession, OpeningBalanceSessionLine } from '@devloggers/db-prisma';
import {
    OpeningBalanceSessionResponseDto,
    OpeningBalanceSessionLineResponseDto,
} from '../dto/opening-balance-session.dto';

function num(value: unknown): number {
    return Number(value ?? 0);
}

function rate(value: unknown): number {
    return Number(value ?? 1);
}

@Injectable()
export class OpeningBalanceSessionsPresenter extends CrudPresenter<OpeningBalanceSession, OpeningBalanceSessionResponseDto> {
    toResponse(entity: OpeningBalanceSession & { lines?: OpeningBalanceSessionLine[] }): OpeningBalanceSessionResponseDto {
        return {
            id: entity.id,
            number: entity.number,
            fiscalPeriodId: entity.fiscalPeriodId,
            status: entity.status,
            description: entity.description ?? null,
            postedAt: entity.postedAt?.toISOString() ?? null,
            postedBy: entity.postedBy ?? null,
            lockedAt: entity.lockedAt?.toISOString() ?? null,
            lockedBy: entity.lockedBy ?? null,
            lines: (entity.lines ?? []).map((line): OpeningBalanceSessionLineResponseDto => ({
                id: line.id,
                dimension: line.dimension,
                accountId: line.accountId ?? null,
                partyId: line.partyId ?? null,
                cashboxId: line.cashboxId ?? null,
                bankAccountId: line.bankAccountId ?? null,
                currencyId: line.currencyId ?? null,
                partySide: line.partySide ?? null,
                amount: num(line.amount),
                exchangeRate: rate(line.exchangeRate),
            })),
            createdAt: entity.createdAt.toISOString(),
            updatedAt: entity.updatedAt.toISOString(),
        };
    }
}