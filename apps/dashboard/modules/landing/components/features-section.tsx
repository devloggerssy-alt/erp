import { getTranslations } from 'next-intl/server'
import { Card, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'

const FEATURE_KEYS = [
  'multiCurrency',
  'mobileInvoicing',
  'aiAssistant',
  'localPayments',
  'inventory',
  'reports',
] as const

export async function FeaturesSection() {
  const t = await getTranslations('business.landing.features')

  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-12 text-center text-3xl font-bold md:text-4xl">
          {t('title')}
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURE_KEYS.map((key) => (
            <Card key={key} className="border-primary/20 bg-card">
              <CardHeader>
                <CardTitle className="text-lg text-primary">{t(`${key}.title`)}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {t(`${key}.body`)}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
