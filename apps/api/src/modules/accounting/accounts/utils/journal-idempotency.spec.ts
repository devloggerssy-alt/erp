import { findExistingPostedJournalEntry } from './journal-idempotency';
import { ReferenceType } from '@devloggers/db-prisma';

describe('findExistingPostedJournalEntry', () => {
  it('returns id when a POSTED JE exists for the reference', async () => {
    const tx = {
      journalEntry: {
        findFirst: jest.fn().mockResolvedValue({ id: 'je-1' }),
      },
    };
    const result = await findExistingPostedJournalEntry(tx as any, {
      tenantId: 't1',
      referenceType: ReferenceType.INVOICE,
      referenceId: 'inv-1',
    });
    expect(result).toEqual({ id: 'je-1' });
    expect(tx.journalEntry.findFirst).toHaveBeenCalledWith({
      where: {
        tenantId: 't1',
        referenceType: ReferenceType.INVOICE,
        referenceId: 'inv-1',
        status: 'POSTED',
      },
      select: { id: true },
    });
  });

  it('returns null when none exists', async () => {
    const tx = { journalEntry: { findFirst: jest.fn().mockResolvedValue(null) } };
    const result = await findExistingPostedJournalEntry(tx as any, {
      tenantId: 't1',
      referenceType: ReferenceType.PAYMENT,
      referenceId: 'pay-1',
    });
    expect(result).toBeNull();
  });
});
