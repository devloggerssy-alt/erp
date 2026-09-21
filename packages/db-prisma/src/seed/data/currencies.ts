import { SEED_IDS } from '../seed-ids'

export const CurrenciesSeedData = [
    {
        id: SEED_IDS.CURRENCY_SYP,
        code: 'SYP',
        name: { ar: 'الليرة السورية', en: 'Syrian Lira' },
        symbol: { ar: 'ل.س', en: '£' },
        isBase: false,
    },
    {
        id: SEED_IDS.CURRENCY_USD,
        code: 'USD',
        name: { ar: 'الدولار الأمريكي', en: 'US Dollar' },
        symbol: { ar: '$', en: '$' },
        isBase: true,
    }
]