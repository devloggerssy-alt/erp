# Sanad Arabic Landing Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Arabic public landing page for Sanad ERP at `/ar`, covering all 7 content sections from the approved spec.

**Architecture:** Static server-rendered Next.js page under `app/[locale]/(public)/page.tsx`. All 7 sections are independent async server components under `modules/landing/components/`. Arabic strings live in `packages/i18n/src/ar/business.json` under the `landing` namespace, accessed via `getTranslations('business.landing.*')`. RTL direction is already applied globally by the root `app/layout.tsx` when `locale === 'ar'`.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS v4 (CSS custom properties), shadcn/ui (Button, Card, Badge), next-intl 4.x server API (`getTranslations`), locale-aware `Link` from `@/i18n/navigation`.

---

## File Map

| File | Action |
|---|---|
| `packages/i18n/src/ar/business.json` | Modify — add `landing.*` Arabic strings |
| `apps/dashboard/modules/landing/components/hero-section.tsx` | Create |
| `apps/dashboard/modules/landing/components/pain-points-section.tsx` | Create |
| `apps/dashboard/modules/landing/components/features-section.tsx` | Create |
| `apps/dashboard/modules/landing/components/how-it-works-section.tsx` | Create |
| `apps/dashboard/modules/landing/components/mobile-payments-section.tsx` | Create |
| `apps/dashboard/modules/landing/components/affordability-strip.tsx` | Create |
| `apps/dashboard/modules/landing/components/final-cta-section.tsx` | Create |
| `apps/dashboard/modules/landing/components/landing-page.tsx` | Create |
| `apps/dashboard/modules/landing/index.ts` | Create |
| `apps/dashboard/app/[locale]/(public)/page.tsx` | Create |

---

### Task 1: Add Arabic landing strings to i18n

**Files:**
- Modify: `packages/i18n/src/ar/business.json`

- [ ] **Step 1: Open `packages/i18n/src/ar/business.json` and add the `landing` key**

Add `"landing": { ... }` as a sibling to `"navigation"`, `"settings"`, and `"resources"` — before the final closing `}` of the root object:

```json
"landing": {
  "hero": {
    "headline": "سَند — برنامج إدارة الأعمال للتاجر السوري",
    "subheadline": "فواتير فورية من هاتفك، دعم الليرة والدولار، ومساعد ذكي يساعدك حتى لو ما عندك خبرة محاسبية.",
    "cta": "سجّل الآن مجاناً"
  },
  "painPoints": {
    "title": "نعرف تحديات تجارتك",
    "currency": {
      "title": "السعر بالليرة ولا بالدولار؟",
      "body": "تسعير البضاعة بعملتين يدوياً مرهق ويسبب أخطاء كل يوم."
    },
    "invoices": {
      "title": "فواتير على ورق أو واتساب",
      "body": "لا أرشيف، لا تتبع، ولا احترافية أمام العميل."
    },
    "software": {
      "title": "البرامج التقنية مو لنا",
      "body": "أغلب الأنظمة تحتاج خبير IT وأسابيع تدريب."
    },
    "payments": {
      "title": "شام كاش وسيريا تيل كاش",
      "body": "كيف تسجّل الدفعات الرقمية مع باقي حساباتك؟"
    }
  },
  "features": {
    "title": "لكل مشكلة — حل واضح",
    "multiCurrency": {
      "title": "ليرة ودولار في نفس الوقت",
      "body": "سعّر بضاعتك بأكثر من عملة وتابع كل حركة مالية بدقة."
    },
    "mobileInvoicing": {
      "title": "فاتورة احترافية في ثوانٍ",
      "body": "أصدر فواتيرك من أي مكان بدون كمبيوتر."
    },
    "aiAssistant": {
      "title": "اسأل سَند",
      "body": "مساعد ذكاء اصطناعي يرشدك ويجاوب أسئلتك حتى بدون خبرة محاسبية."
    },
    "localPayments": {
      "title": "شام كاش وسيريا تيل كاش",
      "body": "سجّل كل مدفوعاتك الرقمية مباشرة في النظام."
    },
    "inventory": {
      "title": "بضاعتك تحت السيطرة",
      "body": "راقب مخزونك في جميع المستودعات لحظة بلحظة."
    },
    "reports": {
      "title": "قرارات مبنية على أرقام",
      "body": "شوف مبيعاتك وأرباحك وحركة المخزون في أي وقت."
    }
  },
  "howItWorks": {
    "title": "ابدأ في 3 خطوات",
    "step1": {
      "title": "سجّل حسابك",
      "body": "مجاناً وبدون أي خبرة تقنية"
    },
    "step2": {
      "title": "أدخل بضاعتك وعملاءك",
      "body": "سَند يرشدك خطوة بخطوة"
    },
    "step3": {
      "title": "ابدأ بالفوترة فوراً",
      "body": "من هاتفك أو الكمبيوتر"
    }
  },
  "mobile": {
    "title": "كل شيء من هاتفك",
    "body": "سَند يعمل على هاتفك مباشرة. أصدر فاتورة، تحقق من مخزونك، واستلم دفعات شام كاش وسيريا تيل كاش — كل شيء من مكان واحد، في أي وقت، وأينما كنت."
  },
  "affordability": {
    "headline": "بدون تعقيد. بدون تكاليف عالية. جاهز اليوم.",
    "body": "لا تحتاج فريق تقنية. لا تحتاج تدريب طويل. فقط سجّل وابدأ."
  },
  "finalCta": {
    "headline": "جاهز تنظّم تجارتك؟",
    "body": "انضم إلى التجار السوريين الذين يديرون أعمالهم بذكاء مع سَند.",
    "cta": "سجّل الآن مجاناً"
  }
}
```

- [ ] **Step 2: Verify the JSON is valid**

```bash
node -e "require('./packages/i18n/src/ar/business.json'); console.log('valid')"
```

Expected output: `valid`

- [ ] **Step 3: Commit**

```bash
git add packages/i18n/src/ar/business.json
git commit -m "feat(i18n): add Arabic landing page strings (business.landing)"
```

---

### Task 2: Build HeroSection

**Files:**
- Create: `apps/dashboard/modules/landing/components/hero-section.tsx`

- [ ] **Step 1: Create the file with the following content**

```tsx
import { getTranslations } from 'next-intl/server'
import { Button } from '@/shared/components/ui/button'
import { Link } from '@/i18n/navigation'

export async function HeroSection() {
  const t = await getTranslations('business.landing.hero')

  return (
    <section className="flex min-h-[85vh] flex-col items-center justify-center bg-primary px-6 py-24 text-center text-primary-foreground">
      <h1 className="mb-6 max-w-4xl text-4xl font-black leading-tight md:text-6xl">
        {t('headline')}
      </h1>
      <p className="mb-10 max-w-2xl text-lg leading-relaxed opacity-90 md:text-xl">
        {t('subheadline')}
      </p>
      <Button size="lg" variant="secondary" asChild className="h-14 px-10 text-lg font-bold">
        <Link href="/register">{t('cta')}</Link>
      </Button>
    </section>
  )
}
```

> `/register` is a placeholder — update to the real registration route once it is built.

---

### Task 3: Build PainPointsSection

**Files:**
- Create: `apps/dashboard/modules/landing/components/pain-points-section.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { getTranslations } from 'next-intl/server'
import { Card, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'

const PAIN_KEYS = ['currency', 'invoices', 'software', 'payments'] as const

export async function PainPointsSection() {
  const t = await getTranslations('business.landing.painPoints')

  return (
    <section className="bg-muted/40 px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-12 text-center text-3xl font-bold md:text-4xl">
          {t('title')}
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PAIN_KEYS.map((key) => (
            <Card key={key} className="border-destructive/20 bg-card">
              <CardHeader>
                <CardTitle className="text-lg">{t(`${key}.title`)}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {t(`${key}.body`)}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
```

---

### Task 4: Build FeaturesSection

**Files:**
- Create: `apps/dashboard/modules/landing/components/features-section.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { getTranslations } from 'next-intl/server'
import { Card, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'

const FEATURE_KEYS = [
  'multiCurrency',
  'mobileInvoicing',
  'aiAssistant',
  'localPayments',
  'inventory',
  'reports',
] as const

export async function FeaturesSection() {
  const t = await getTranslations('business.landing.features')

  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-12 text-center text-3xl font-bold md:text-4xl">
          {t('title')}
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURE_KEYS.map((key) => (
            <Card key={key} className="border-primary/20 bg-card">
              <CardHeader>
                <CardTitle className="text-lg text-primary">{t(`${key}.title`)}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {t(`${key}.body`)}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
```

---

### Task 5: Build HowItWorksSection

**Files:**
- Create: `apps/dashboard/modules/landing/components/how-it-works-section.tsx`

- [ ] **Step 1: Create the file**

```tsx
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
```

---

### Task 6: Build MobilePaymentsSection

**Files:**
- Create: `apps/dashboard/modules/landing/components/mobile-payments-section.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { getTranslations } from 'next-intl/server'
import { Badge } from '@/shared/components/ui/badge'

export async function MobilePaymentsSection() {
  const t = await getTranslations('business.landing.mobile')

  return (
    <section className="bg-primary px-6 py-20 text-primary-foreground">
      <div className="mx-auto max-w-3xl text-center">
        <div className="mb-6 flex justify-center gap-3">
          <Badge variant="secondary" className="px-4 py-1 text-sm font-semibold">
            شام كاش
          </Badge>
          <Badge variant="secondary" className="px-4 py-1 text-sm font-semibold">
            سيريا تيل كاش
          </Badge>
        </div>
        <h2 className="mb-6 text-3xl font-bold md:text-4xl">{t('title')}</h2>
        <p className="text-lg leading-relaxed opacity-90">{t('body')}</p>
      </div>
    </section>
  )
}
```

---

### Task 7: Build AffordabilityStrip

**Files:**
- Create: `apps/dashboard/modules/landing/components/affordability-strip.tsx`

- [ ] **Step 1: Create the file**

```tsx
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
```

---

### Task 8: Build FinalCtaSection

**Files:**
- Create: `apps/dashboard/modules/landing/components/final-cta-section.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { getTranslations } from 'next-intl/server'
import { Button } from '@/shared/components/ui/button'
import { Link } from '@/i18n/navigation'

export async function FinalCtaSection() {
  const t = await getTranslations('business.landing.finalCta')

  return (
    <section className="px-6 py-24 text-center">
      <div className="mx-auto max-w-2xl">
        <h2 className="mb-4 text-3xl font-black md:text-4xl">{t('headline')}</h2>
        <p className="mb-10 text-lg text-muted-foreground">{t('body')}</p>
        <Button size="lg" asChild className="h-14 px-10 text-lg font-bold">
          <Link href="/register">{t('cta')}</Link>
        </Button>
      </div>
    </section>
  )
}
```

---

### Task 9: Compose LandingPage, barrel, and route page

**Files:**
- Create: `apps/dashboard/modules/landing/components/landing-page.tsx`
- Create: `apps/dashboard/modules/landing/index.ts`
- Create: `apps/dashboard/app/[locale]/(public)/page.tsx`

- [ ] **Step 1: Create `landing-page.tsx`**

```tsx
import { HeroSection } from './hero-section'
import { PainPointsSection } from './pain-points-section'
import { FeaturesSection } from './features-section'
import { HowItWorksSection } from './how-it-works-section'
import { MobilePaymentsSection } from './mobile-payments-section'
import { AffordabilityStrip } from './affordability-strip'
import { FinalCtaSection } from './final-cta-section'

export async function LandingPage() {
  return (
    <main>
      <HeroSection />
      <PainPointsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <MobilePaymentsSection />
      <AffordabilityStrip />
      <FinalCtaSection />
    </main>
  )
}
```

- [ ] **Step 2: Create `index.ts`**

```ts
export { LandingPage } from './components/landing-page'
```

- [ ] **Step 3: Create the route page**

```tsx
// apps/dashboard/app/[locale]/(public)/page.tsx
import { setRequestLocale } from 'next-intl/server'
import { LandingPage } from '@/modules/landing'

type Props = { params: Promise<{ locale: string }> }

export default async function Page({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  return <LandingPage />
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/modules/landing apps/dashboard/app/[locale]/\(public\)
git commit -m "feat(dashboard): Sanad Arabic landing page — all 7 sections"
```

---

### Task 10: Verify

- [ ] **Step 1: Start the dashboard dev server**

```bash
pnpm --filter @devloggers/dashboard dev
```

- [ ] **Step 2: Open the landing page in a browser**

Navigate to: `http://localhost:3000/ar`

Expected:
- Page renders in Arabic with RTL text direction (confirmed by `<html dir="rtl">` in root layout)
- Section 1 — Hero: lime-green background, large Arabic headline, white CTA button
- Section 2 — Pain Points: 4 cards on muted background
- Section 3 — Features: 6 cards with primary-colored titles
- Section 4 — How It Works: 3 numbered circles on muted background
- Section 5 — Mobile Payments: lime-green background, two payment badges
- Section 6 — Affordability: bordered strip with bold headline
- Section 7 — Final CTA: centered headline and green button

- [ ] **Step 3: Check the browser console for missing translation errors**

Expected: no `MISSING_MESSAGE` warnings.

---

## Notes

- `/register` in Hero and FinalCta is a placeholder — update to the real registration route once it is built.
- `en` and `tr` locales will render a blank page at `/en` and `/tr` — the `onError` handler in `packages/i18n/src/next-intl/request.mts` silently swallows `MISSING_MESSAGE` errors. This is acceptable since the landing is Arabic-only for now.
- No separate `(public)/layout.tsx` is needed — the `[locale]/layout.tsx` already provides the locale wrapper and `NextIntlClientProvider`.
