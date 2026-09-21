import type { ItemType } from '@devloggers/db-prisma';

/**
 * The single item-type catalog, anchored to the Prisma `ItemType` enum.
 *
 * `ItemType` is re-exported from the database seam so contracts, validators and
 * the dashboard all speak the same union. The runtime `ITEM_TYPES` list is a
 * mirror rather than a re-export of the Prisma client because api-contracts is
 * bundled into the browser; `item-type-catalog.test.ts` fails if the mirror
 * ever drifts from the schema.
 */
export type { ItemType };

export const ITEM_TYPES = ['product', 'service'] as const satisfies readonly ItemType[];
