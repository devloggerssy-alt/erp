import { getTranslations } from 'next-intl/server'
import { Badge } from '@/shared/components/ui/badge'

export async function MobilePaymentsSection() {
  const t = await getTranslations('business.landing.mobile')

  return (
    <section className="bg-primary px-6 py-20 text-primary-foreground">
      <div className="mx-auto max-w-3xl text-center">
        <div className="mb-6 flex justify-center gap-3">
          <Badge variant="secondary" className="px-4 py-1 text-sm font-semibold">
            شام كاش
          </Badge>
          <Badge variant="secondary" className="px-4 py-1 text-sm font-semibold">
            سيريا تيل كاش
          </Badge>
        </div>
        <h2 className="mb-6 text-3xl font-bold md:text-4xl">{t('title')}</h2>
        <p className="text-lg leading-relaxed opacity-90">{t('body')}</p>
      </div>
    </section>
  )
}
