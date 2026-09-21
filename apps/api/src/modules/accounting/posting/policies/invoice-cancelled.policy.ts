import { Injectable } from '@nestjs/common';
import { ReferenceType } from '@devloggers/db-prisma';

/**
 * No line-builder: JournalPostingService.reverse mirrors the original entry's
 * lines verbatim. This class only names the reversal's referenceType so the
 * registry's dispatch stays uniform across every posting kind.
 */
@Injectable()
export class InvoiceCancelledPolicy {
    readonly referenceType = ReferenceType.INVOICE_CANCELLATION;
}
