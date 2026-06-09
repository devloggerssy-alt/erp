import { getTranslations } from 'next-intl/server'

const STEP_KEYS = ['step1', 'step2', 'step3'] as const

export async function HowItWorksSection() {
  const t = await getTranslations('business.landing.howItWorks')

  return (
    <section className="bg-muted/40 px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-12 text-center text-3xl font-bold md:text-4xl">
          {t('title')}
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          {STEP_KEYS.map((key, index) => (
            <div key={key} className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-2xl font-black text-primary-foreground">
                {index + 1}
              </div>
              <h3 className="mb-2 text-xl font-bold">{t(`${key}.title`)}</h3>
              <p className="text-muted-foreground">{t(`${key}.body`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
