import type { LocalizedString } from '@devloggers/api-contracts';
import type { Prisma } from '@devloggers/db-prisma';

/** Name and symbol columns are JSON holding `{ ar, en? }`. Anything else has no localized value. */
export function toLocalizedString(value: Prisma.JsonValue | null | undefined): LocalizedString | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const { ar, en } = value;
  if (typeof ar !== 'string') return undefined;
  return typeof en === 'string' ? { ar, en } : { ar };
}
