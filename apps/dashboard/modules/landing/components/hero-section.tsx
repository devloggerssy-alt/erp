import { getTranslations } from 'next-intl/server'
import { Rocket } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Link } from '@/i18n/navigation'

function PhoneIllustration() {
  const green = 'oklch(77.17% 0.20466 129.029)'
  const grayLight = 'oklch(92.2% 0 0)'
  const grayMid = 'oklch(75% 0 0)'
  const bgCanvas = 'oklch(96.416% 0.00011 271.152)'
  const ink = 'oklch(12% 0 0)'

  return (
    <svg
      viewBox="0 0 260 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-[240px] drop-shadow-2xl"
      aria-hidden="true"
    >
      {/* Phone body */}
      <rect width="260" height="500" rx="36" fill="white" />
      <rect x="3" y="3" width="254" height="494" rx="33" stroke={grayLight} strokeWidth="2" />
      {/* Notch */}
      <rect x="95" y="18" width="70" height="18" rx="9" fill={grayLight} />
      {/* Home bar */}
      <rect x="100" y="468" width="60" height="7" rx="3.5" fill={grayLight} />
      {/* Screen */}
      <rect x="12" y="56" width="236" height="400" fill={bgCanvas} />
      {/* Invoice header */}
      <rect x="12" y="56" width="236" height="44" fill={green} />
      <text x="130" y="82" textAnchor="middle" fill="white" fontSize="14" fontFamily="Tajawal, sans-serif" fontWeight="700">فاتورة بيع #١٠٤٢</text>
      {/* Meta row */}
      <rect x="24" y="110" width="88" height="8" rx="4" fill={grayLight} />
      <rect x="150" y="110" width="86" height="8" rx="4" fill={grayLight} />
      {/* Divider */}
      <rect x="24" y="126" width="212" height="1" fill={grayLight} />
      {/* Product rows */}
      <rect x="24" y="136" width="120" height="8" rx="4" fill={grayMid} />
      <rect x="190" y="136" width="46" height="8" rx="4" fill={green} opacity="0.45" />
      <rect x="24" y="154" width="100" height="8" rx="4" fill={grayMid} />
      <rect x="190" y="154" width="46" height="8" rx="4" fill={green} opacity="0.45" />
      <rect x="24" y="172" width="130" height="8" rx="4" fill={grayMid} />
      <rect x="190" y="172" width="46" height="8" rx="4" fill={green} opacity="0.45" />
      <rect x="24" y="190" width="90" height="8" rx="4" fill={grayMid} />
      <rect x="190" y="190" width="46" height="8" rx="4" fill={green} opacity="0.45" />
      {/* Total divider */}
      <rect x="24" y="208" width="212" height="1" fill={grayLight} />
      {/* Total label + value */}
      <rect x="24" y="218" width="55" height="10" rx="5" fill={ink} />
      <rect x="148" y="216" width="88" height="14" rx="7" fill={green} />
      {/* Print button */}
      <rect x="24" y="244" width="212" height="40" rx="12" fill={green} />
      <text x="130" y="268" textAnchor="middle" fill="white" fontSize="13" fontFamily="Tajawal, sans-serif" fontWeight="600">طباعة الفاتورة</text>
      {/* Badges */}
      <rect x="24" y="298" width="84" height="24" rx="12" fill={green} opacity="0.15" />
      <text x="66" y="314" textAnchor="middle" fill="oklch(40% 0.1 129.029)" fontSize="11" fontFamily="Tajawal, sans-serif" fontWeight="600">مدفوعة ✓</text>
      <rect x="120" y="298" width="60" height="24" rx="12" fill={grayLight} />
      <text x="150" y="314" textAnchor="middle" fill="oklch(40% 0 0)" fontSize="10" fontFamily="Tajawal, sans-serif">$ USD</text>
      {/* Bottom nav bar */}
      <rect x="12" y="408" width="236" height="48" fill="white" />
      <rect x="12" y="408" width="236" height="1" fill={grayLight} />
      <circle cx="58" cy="432" r="10" fill={green} />
      <circle cx="130" cy="432" r="10" fill={grayLight} />
      <circle cx="202" cy="432" r="10" fill={grayLight} />
    </svg>
  )
}

export async function HeroSection() {
  const t = await getTranslations('business.landing.hero')

  return (
    <>
      <style>{`
        @keyframes lp-fade-up {
          from { opacity: 0; transform: translateY(1.25rem); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lp-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .lp-h1, .lp-sub, .lp-cta, .lp-phone { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
        .lp-h1   { animation: lp-fade-up 0.65s ease-out both; animation-delay: 0.05s; }
        .lp-sub  { animation: lp-fade-up 0.65s ease-out both; animation-delay: 0.2s; }
        .lp-cta  { animation: lp-fade-up 0.65s ease-out both; animation-delay: 0.35s; }
        .lp-phone{ animation: lp-fade-in 0.9s ease-out both;  animation-delay: 0.25s; }
      `}</style>

      <section className="relative flex min-h-[90vh] items-center overflow-hidden bg-primary">
        {/* Soft background blobs */}
        <span className="pointer-events-none absolute -start-24 -top-24 h-[480px] w-[480px] rounded-full bg-white opacity-[0.06]" aria-hidden="true" />
        <span className="pointer-events-none absolute -bottom-16 -end-16 h-80 w-80 rounded-full bg-white opacity-[0.06]" aria-hidden="true" />

        <div className="relative mx-auto w-full max-w-6xl px-6 py-20">
          <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2">
            {/* Text */}
            <div className="text-primary-foreground">
              <h1 className="lp-h1 mb-6 text-balance text-[clamp(2.25rem,5vw,4.5rem)] font-black leading-[1.1]">
                {t('headline')}
              </h1>
              <p className="lp-sub mb-10 max-w-lg text-lg leading-relaxed opacity-90 md:text-xl">
                {t('subheadline')}
              </p>
              <div className="lp-cta">
                <Button
                  size="lg"
                  variant="secondary"
                  asChild
                  className="h-14 px-10 text-lg font-bold shadow-[0_4px_28px_oklch(0%_0_0_/_25%)]"
                >
                  <Link href="/register">
                    {t('cta')}
                    <Rocket className="ms-2 h-5 w-5 rtl:-scale-x-100" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Phone illustration */}
            <div className="lp-phone flex justify-center">
              <PhoneIllustration />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
