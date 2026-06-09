import { getTranslations } from 'next-intl/server'
import { Card, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'

const PAIN_KEYS = ['currency', 'invoices', 'software', 'payments'] as const

export async function PainPointsSection() {
  const t = await getTranslations('business.landing.painPoints')

  return (
    <section className="bg-muted/40 px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-12 text-center text-3xl font-bold md:text-4xl">
          {t('title')}
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PAIN_KEYS.map((key) => (
            <Card key={key} className="border-destructive/20 bg-card">
              <CardHeader>
                <CardTitle className="text-lg">{t(`${key}.title`)}</CardTitle>
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
