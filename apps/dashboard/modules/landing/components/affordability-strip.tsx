import { getTranslations } from 'next-intl/server'
import { CheckIcon } from 'lucide-react'

export async function AffordabilityStrip() {
  const t = await getTranslations('business.landing.affordability')

  return (
    <section className="bg-[oklch(10%_0_0)] px-6 py-20 text-white">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="mb-5 text-2xl font-black leading-snug md:text-3xl">
          {t('headline')}
        </h2>
        <p className="mb-10 text-lg text-[oklch(68%_0_0)]">{t('body')}</p>
        <div className="flex flex-wrap justify-center gap-4">
          {(['check1', 'check2', 'check3'] as const).map((key) => (
            <div key={key} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
              <CheckIcon className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
              <span className="text-sm font-medium">{t(key)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
