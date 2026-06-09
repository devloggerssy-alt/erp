import { getTranslations } from 'next-intl/server'
import { Button } from '@/shared/components/ui/button'
import { Link } from '@/i18n/navigation'

export async function HeroSection() {
  const t = await getTranslations('business.landing.hero')

  return (
    <section className="flex min-h-[85vh] flex-col items-center justify-center bg-primary px-6 py-24 text-center text-primary-foreground">
      <h1 className="mb-6 max-w-4xl text-4xl font-black leading-tight md:text-6xl">
        {t('headline')}
      </h1>
      <p className="mb-10 max-w-2xl text-lg leading-relaxed opacity-90 md:text-xl">
        {t('subheadline')}
      </p>
      <Button size="lg" variant="secondary" asChild className="h-14 px-10 text-lg font-bold">
        <Link href="/register">{t('cta')}</Link>
      </Button>
    </section>
  )
}
