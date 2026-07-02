import { BadRequestException } from '@nestjs/common';

/**
 * Throws unless the given fiscal-period status is OPEN.
 * Used by all posting/cancel flows to block writes to CLOSED / LOCKED periods.
 */
export function assertFiscalPeriodOpen(
    status: string | null | undefined,
    periodLabel = 'fiscal period',
): void {
    if (status !== 'OPEN') {
        const state = status ? status.toLowerCase() : 'missing';
        throw new BadRequestException(
            `Cannot post to a ${state} ${periodLabel}. Only OPEN periods accept postings.`,
        );
    }
}
