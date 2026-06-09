import { getTranslations } from 'next-intl/server'
import {
  SmartphoneIcon,
  PrinterIcon,
  PackageSearchIcon,
  WalletIcon,
  CheckCircle2Icon,
} from 'lucide-react'

const CAPABILITIES = [
  { Icon: PrinterIcon,       labelKey: 'capInvoice' },
  { Icon: PackageSearchIcon, labelKey: 'capStock' },
  { Icon: WalletIcon,        labelKey: 'capPayments' },
] as const

export async function MobilePaymentsSection() {
  const t = await getTranslations('business.landing.mobile')

  return (
    <section className="bg-primary px-6 py-24 text-primary-foreground">
      <div className="mx-auto max-w-5xl">
        <div className="grid items-center gap-14 md:grid-cols-2">

          {/* Text side */}
          <div>
            <h2 className="mb-5 text-3xl font-bold md:text-4xl">{t('title')}</h2>
            <p className="mb-8 text-lg leading-relaxed opacity-90">{t('body')}</p>

            {/* Mobile capability list */}
            <ul className="space-y-3">
              {(['capInvoice', 'capStock', 'capPayments'] as const).map((key) => (
                <li key={key} className="flex items-center gap-3">
                  <CheckCircle2Icon className="h-5 w-5 shrink-0 text-primary-foreground" strokeWidth={2} />
                  <span className="font-medium">{t(key)}</span>
                </li>
              ))}
            </ul>

            {/* Payment badges */}
            <div className="mt-8 flex flex-wrap gap-3">
              {['شام كاش', 'سيريا تيل كاش'].map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-primary-foreground/30 bg-primary-foreground/10 px-5 py-1.5 text-sm font-semibold"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Visual side — phone icon with decoration */}
          <div className="flex justify-center">
            <div className="relative">
              {/* Outer glow ring */}
              <div className="absolute inset-0 rounded-full bg-primary-foreground/10 blur-2xl" />
              <div className="relative flex h-48 w-48 items-center justify-center rounded-full border border-primary-foreground/20 bg-primary-foreground/10">
                <SmartphoneIcon className="h-24 w-24 text-primary-foreground" strokeWidth={1} />
              </div>
              {/* Floating capability badges */}
              {CAPABILITIES.map(({ Icon, labelKey }, i) => {
                const positions = [
                  '-top-6 -end-10',
                  'top-1/2 -translate-y-1/2 -end-20',
                  '-bottom-6 -end-10',
                ]
                return (
                  <div
                    key={labelKey}
                    className={`absolute ${positions[i]} flex items-center gap-2 rounded-xl border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-2 backdrop-blur-sm`}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                    <span className="whitespace-nowrap text-xs font-semibold">{t(labelKey)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
