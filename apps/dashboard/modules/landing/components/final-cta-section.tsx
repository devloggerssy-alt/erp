import { getTranslations } from 'next-intl/server'
import { Button } from '@/shared/components/ui/button'
import { Link } from '@/i18n/navigation'

export async function FinalCtaSection() {
  const t = await getTranslations('business.landing.finalCta')

  return (
    <section className="relative overflow-hidden bg-background px-6 py-28 text-center">
      {/* Subtle decorative circle */}
      <span
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-primary/5"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-2xl">
        <h2 className="mb-4 text-balance text-3xl font-black md:text-4xl">{t('headline')}</h2>
        <p className="mb-10 text-lg text-muted-foreground">{t('body')}</p>
        <Button
          size="lg"
          asChild
          className="h-14 px-10 text-lg font-bold shadow-[0_0_20px_oklch(77.17%_0.20466_129.029_/_0.5)]"
        >
          <Link href="/register">{t('cta')}</Link>
        </Button>
      </div>
    </section>
  )
}
