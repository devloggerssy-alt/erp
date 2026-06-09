import { getTranslations } from 'next-intl/server'
import { ArrowLeftRightIcon, FileWarningIcon, MonitorXIcon, QrCodeIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const PAINS: { key: 'currency' | 'invoices' | 'software' | 'payments'; Icon: LucideIcon }[] = [
  { key: 'currency', Icon: ArrowLeftRightIcon },
  { key: 'invoices', Icon: FileWarningIcon },
  { key: 'software', Icon: MonitorXIcon },
  { key: 'payments', Icon: QrCodeIcon },
]

export async function PainPointsSection() {
  const t = await getTranslations('business.landing.painPoints')

  return (
    <section className="bg-[oklch(10%_0_0)] px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-14 text-center text-3xl font-bold text-white md:text-4xl">
          {t('title')}
        </h2>
        <div className="grid gap-10 md:grid-cols-2">
          {PAINS.map(({ key, Icon }) => (
            <div key={key} className="flex items-start gap-5">
              <div className="shrink-0 rounded-xl bg-[oklch(77.17%_0.20466_129.029_/_0.12)] p-3">
                <Icon className="h-8 w-8 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="mb-2 text-xl font-bold text-white">{t(`${key}.title`)}</h3>
                <p className="leading-relaxed text-[oklch(68%_0_0)]">{t(`${key}.body`)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
