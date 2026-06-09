import { getTranslations } from 'next-intl/server'
import { UserCheckIcon, DatabaseIcon, ZapIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const STEPS: { key: 'step1' | 'step2' | 'step3'; Icon: LucideIcon; num: string }[] = [
  { key: 'step1', Icon: UserCheckIcon, num: '١' },
  { key: 'step2', Icon: DatabaseIcon,  num: '٢' },
  { key: 'step3', Icon: ZapIcon,       num: '٣' },
]

export async function HowItWorksSection() {
  const t = await getTranslations('business.landing.howItWorks')

  return (
    <section className="bg-muted/40 px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-16 text-center text-3xl font-bold md:text-4xl">
          {t('title')}
        </h2>

        {/* Steps row — relative for the connector line */}
        <div className="relative grid gap-10 md:grid-cols-3 md:gap-6">
          {/* Connector line (desktop only) */}
          <span
            className="pointer-events-none absolute start-[calc(16.67%+1.5rem)] end-[calc(16.67%+1.5rem)] top-7 hidden h-px bg-primary/30 md:block"
            aria-hidden="true"
          />

          {STEPS.map(({ key, Icon, num }) => (
            <div key={key} className="relative flex flex-col items-center text-center">
              {/* Icon circle with step number */}
              <div className="relative mb-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_20px_oklch(77.17%_0.20466_129.029_/_0.4)]">
                  <Icon className="h-6 w-6" strokeWidth={2} />
                </div>
                <span className="absolute -end-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-[10px] font-black text-background">
                  {num}
                </span>
              </div>
              <h3 className="mb-2 text-lg font-bold">{t(`${key}.title`)}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{t(`${key}.body`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
