import type { components } from '../../types/index'

/** The localized-string shape is generated; this is the contracts-facing name. */
export type LocalizedString = components['schemas']['LocalizedStringDto']

export type NullableLocalizedString = LocalizedString | null;
