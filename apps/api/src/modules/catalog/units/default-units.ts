/**
 * Standard units of measure bootstrapped for every new tenant during
 * onboarding. Mirrors `packages/db-prisma/src/seed/seeds/units.seed.ts`
 * (demo-seed definitions) — keep both in sync.
 */
export interface DefaultUnit {
    name: { ar: string; en: string };
    abbreviation: string;
}

export const DEFAULT_UNITS: DefaultUnit[] = [
    { name: { ar: 'قطعة', en: 'Piece' }, abbreviation: 'pcs' },
    { name: { ar: 'كيلوغرام', en: 'Kilogram' }, abbreviation: 'kg' },
    { name: { ar: 'لتر', en: 'Liter' }, abbreviation: 'L' },
    { name: { ar: 'متر', en: 'Meter' }, abbreviation: 'm' },
    { name: { ar: 'علبة', en: 'Box' }, abbreviation: 'box' },
    { name: { ar: 'دزينة', en: 'Dozen' }, abbreviation: 'doz' },
    { name: { ar: 'حزمة', en: 'Pack' }, abbreviation: 'pack' },
];
