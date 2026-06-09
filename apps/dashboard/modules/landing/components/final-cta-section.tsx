import { getTranslations } from 'next-intl/server'
import { Button } from '@/shared/components/ui/button'
import { Link } from '@/i18n/navigation'

export async function FinalCtaSection() {
  const t = await getTranslations('business.landing.finalCta')

  return (
    <section className="px-6 py-24 text-center">
      <div className="mx-auto max-w-2xl">
        <h2 className="mb-4 text-3xl font-black md:text-4xl">{t('headline')}</h2>
        <p className="mb-10 text-lg text-muted-foreground">{t('body')}</p>
        <Button size="lg" asChild className="h-14 px-10 text-lg font-bold">
          <Link href="/register">{t('cta')}</Link>
        </Button>
      </div>
    </section>
  )
}
