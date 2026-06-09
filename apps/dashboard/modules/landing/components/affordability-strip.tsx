import { getTranslations } from 'next-intl/server'

export async function AffordabilityStrip() {
  const t = await getTranslations('business.landing.affordability')

  return (
    <section className="border-y bg-card px-6 py-14 text-center">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-4 text-2xl font-black md:text-3xl">{t('headline')}</h2>
        <p className="text-lg text-muted-foreground">{t('body')}</p>
      </div>
    </section>
  )
}
