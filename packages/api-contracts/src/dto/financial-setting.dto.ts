import type { components } from '../../types/index'

/**
 * The financial-settings upsert body. The generated component is emitted under
 * its route-derived name (`...BodyDto`); this alias keeps the contracts-facing
 * name consumers already import while the shape stays generated.
 */
export type UpsertFinancialSettingDto = components['schemas']['UpsertFinancialSettingBodyDto']
