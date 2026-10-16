import { Injectable } from '@nestjs/common';
import { CrudPresenter } from '@devloggers/backend-core';
import type { OpeningBalanceSession } from '@devloggers/db-prisma';
import {
    OpeningBalanceSessionResponseDto,
    OpeningBalanceSessionLineResponseDto,
} from '../dto/opening-balance-session.dto';
import type { OpeningBalanceSessionWithLines } from './opening-balance-sessions.repository';

function num(value: unknown): number {
    return Number(value ?? 0);
}

function rate(value: unknown): number {
    return Number(value ?? 1);
}

@Injectable()
export class OpeningBalanceSessionsPresenter extends CrudPresenter<
    OpeningBalanceSession | OpeningBalanceSessionWithLines,
    OpeningBalanceSessionResponseDto
> {
    toResponse(entity: OpeningBalanceSession | OpeningBalanceSessionWithLines): OpeningBalanceSessionResponseDto {
        const lines = 'lines' in entity ? entity.lines : [];
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
            lines: lines.map((line): OpeningBalanceSessionLineResponseDto => ({
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