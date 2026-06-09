import { getTranslations } from 'next-intl/server'
import {
  CoinsIcon,
  SmartphoneIcon,
  BotIcon,
  BanknoteIcon,
  WarehouseIcon,
  BarChart3Icon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type FeatureKey = 'multiCurrency' | 'mobileInvoicing' | 'aiAssistant' | 'localPayments' | 'inventory' | 'reports'

const FEATURES: { key: FeatureKey; Icon: LucideIcon }[] = [
  { key: 'multiCurrency',   Icon: CoinsIcon },
  { key: 'mobileInvoicing', Icon: SmartphoneIcon },
  { key: 'aiAssistant',     Icon: BotIcon },
  { key: 'localPayments',   Icon: BanknoteIcon },
  { key: 'inventory',       Icon: WarehouseIcon },
  { key: 'reports',         Icon: BarChart3Icon },
]

export async function FeaturesSection() {
  const t = await getTranslations('business.landing.features')

  return (
    <section className="bg-background px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-14 text-center text-3xl font-bold md:text-4xl">
          {t('title')}
        </h2>

        {/* First 2 features: wide rows with accent treatment */}
        <div className="mb-10 grid gap-6 md:grid-cols-2">
          {FEATURES.slice(0, 2).map(({ key, Icon }) => (
            <div
              key={key}
              className="flex items-start gap-5 rounded-2xl border border-primary/20 bg-card p-6"
            >
              <div className="shrink-0 rounded-xl bg-primary/10 p-3">
                <Icon className="h-10 w-10 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="mb-2 text-xl font-bold">{t(`${key}.title`)}</h3>
                <p className="leading-relaxed text-muted-foreground">{t(`${key}.body`)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Remaining 4: compact 2-col rows, no card border */}
        <div className="grid gap-8 md:grid-cols-2">
          {FEATURES.slice(2).map(({ key, Icon }) => (
            <div key={key} className="flex items-start gap-4">
              <div className="shrink-0 rounded-lg bg-primary/8 p-2.5">
                <Icon className="h-6 w-6 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="mb-1 text-lg font-semibold">{t(`${key}.title`)}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{t(`${key}.body`)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
