'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { MenuIcon, XIcon } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { Button } from '@/shared/components/ui/button'

function SanadMark() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="oklch(77.17% 0.20466 129.029)" />
      {/* Arch / support mark: crossbar + two pillars */}
      <rect x="7" y="8" width="18" height="4.5" rx="2.25" fill="white" />
      <rect x="7" y="12.5" width="5" height="11.5" rx="2.5" fill="white" />
      <rect x="20" y="12.5" width="5" height="11.5" rx="2.5" fill="white" />
    </svg>
  )
}

export function LandingNavbar() {
  const t = useTranslations('business.landing.nav')
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const check = () => setScrolled(window.scrollY > 60)
    check()
    window.addEventListener('scroll', check, { passive: true })
    return () => window.removeEventListener('scroll', check)
  }, [])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMenuOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const solid = scrolled || menuOpen

  return (
    <>
      <header
        role="banner"
        className={[
          'fixed inset-x-0 top-0 z-50 h-16',
          'transition-[background-color,border-color,box-shadow] duration-200 ease-out',
          solid
            ? 'border-b border-[oklch(92.2%_0_0)] bg-[oklch(97.5%_0_0/0.96)] shadow-[0_1px_0_oklch(92.2%_0_0)] backdrop-blur-sm'
            : 'border-b border-transparent bg-transparent',
        ].join(' ')}
      >
        <div className="mx-auto flex h-full max-w-6xl items-center px-6">
          {/* Logo */}
          <Link
            href="/landing"
            className="flex shrink-0 items-center gap-2.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label={t('logoLabel')}
          >
            <SanadMark />
            <span
              className={[
                'font-black text-xl tracking-[-0.01em] transition-colors duration-200',
                solid ? 'text-[oklch(6.2%_0_0)]' : 'text-white',
              ].join(' ')}
            >
              سَند
            </span>
          </Link>

          <div className="flex-1" aria-hidden="true" />

          {/* Desktop nav */}
          <nav aria-label={t('ariaLabel')} className="hidden items-center gap-4 md:flex">
            <Link
              href="/login"
              className={[
                'text-sm font-medium transition-colors duration-200 hover:opacity-70',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm',
                solid ? 'text-[oklch(6.2%_0_0)]' : 'text-white',
              ].join(' ')}
            >
              {t('login')}
            </Link>

            {solid ? (
              <Button
                asChild
                size="sm"
                className="h-9 px-5 font-semibold shadow-[0_0_15px_-5px_oklch(77.17%_0.20466_129.029)] hover:opacity-90 hover:shadow-[0_0_20px_0px_oklch(77.17%_0.20466_129.029)]"
              >
                <Link href="/register">{t('register')}</Link>
              </Button>
            ) : (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-9 border-white/60 bg-white/10 px-5 font-semibold text-white hover:bg-white/20 hover:text-white focus-visible:ring-white"
              >
                <Link href="/register">{t('register')}</Link>
              </Button>
            )}
          </nav>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="lp-mobile-nav"
            aria-label={menuOpen ? t('closeMenu') : t('openMenu')}
            className={[
              'flex h-9 w-9 items-center justify-center rounded-md transition-colors duration-200 md:hidden',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              solid
                ? 'text-[oklch(6.2%_0_0)] hover:bg-[oklch(94.9%_0_0)]'
                : 'text-white hover:bg-white/10',
            ].join(' ')}
          >
            {menuOpen ? (
              <XIcon className="h-5 w-5" strokeWidth={2} />
            ) : (
              <MenuIcon className="h-5 w-5" strokeWidth={2} />
            )}
          </button>
        </div>
      </header>

      {/* Mobile menu panel */}
      <div
        id="lp-mobile-nav"
        role="navigation"
        aria-label={t('ariaLabel')}
        className={[
          'fixed inset-x-0 top-16 z-40 md:hidden',
          'border-b border-[oklch(92.2%_0_0)] bg-[oklch(97.5%_0_0)] px-6 py-5',
          'motion-safe:transition-[transform,opacity] motion-safe:duration-200 motion-safe:ease-out',
          menuOpen
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-2 opacity-0',
        ].join(' ')}
        aria-hidden={!menuOpen}
      >
        <div className="flex flex-col gap-3">
          <Link
            href="/login"
            onClick={() => setMenuOpen(false)}
            className="flex h-11 items-center justify-center rounded-lg text-sm font-medium text-[oklch(6.2%_0_0)] transition-colors hover:bg-[oklch(94.9%_0_0)]"
          >
            {t('login')}
          </Link>
          <Button
            asChild
            className="h-11 w-full font-semibold shadow-[0_0_15px_-5px_oklch(77.17%_0.20466_129.029)]"
          >
            <Link href="/register" onClick={() => setMenuOpen(false)}>
              {t('register')}
            </Link>
          </Button>
        </div>
      </div>

      {/* Mobile menu backdrop — always in DOM, transitions opacity */}
      <div
        className={[
          'fixed inset-0 top-16 z-30 bg-[oklch(0%_0_0/0.2)] md:hidden',
          'motion-safe:transition-opacity motion-safe:duration-150 motion-safe:ease-out',
          menuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />
    </>
  )
}
