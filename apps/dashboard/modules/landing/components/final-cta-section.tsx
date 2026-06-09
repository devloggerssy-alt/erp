import { getTranslations } from 'next-intl/server'
import { Rocket, MessageCircle, Mail } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Link } from '@/i18n/navigation'

export async function FinalCtaSection() {
  const t = await getTranslations('business.landing.finalCta')

  return (
    <section className="relative overflow-hidden bg-background px-6 py-28 text-center border-t">
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
          className="h-14 px-10 text-lg font-bold shadow-[0_0_20px_oklch(77.17%_0.20466_129.029_/_0.5)] mb-16"
        >
          <Link href="/register">
            {t('cta')}
            <Rocket className="ms-2 h-5 w-5 rtl:-scale-x-100" />
          </Link>
        </Button>

        <div className="mt-6 flex flex-col items-center justify-center gap-4 text-muted-foreground border-t pt-10">
          <p className="font-semibold text-foreground">للتواصل والمبيعات :</p>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <a href="https://wa.me/963956954441" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-foreground transition-colors group">
              <MessageCircle className="h-5 w-5 text-green-500 group-hover:scale-110 transition-transform" />
              <span dir="ltr">+963 956954441</span>
            </a>
            <a href="mailto:mohammadkhayata.gm@gmail.com" className="flex items-center gap-2 hover:text-foreground transition-colors group">
              <Mail className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
              <span>mohammadkhayata.gm@gmail.com</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
