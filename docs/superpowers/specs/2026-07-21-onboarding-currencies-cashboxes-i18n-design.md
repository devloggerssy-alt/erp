# Design Spec: Onboarding — Currencies, Cashboxes & i18n

**Date:** 2026-07-21
**Status:** Approved

---

## Overview

Extend the onboarding wizard to auto-create currencies (SYP + USD with USD as base) and cashboxes, and localize all onboarding UI strings (AR/EN).

## Current State

The onboarding wizard has 5 steps with all UI strings hardcoded in English. Currencies and cashboxes are only created via database seed — never during real tenant onboarding. A `bootstrapCurrencies` method exists in the service but is dead code.

## Target Flow (6 steps)

| Step | Name | User Interaction | Creates |
|------|------|-----------------|---------|
| 1 | Company Profile | Fill form, submit | Updates tenant + settings |
| 2 | Fiscal Year | Fill form, submit | Fiscal period |
| 3 | Chart of Accounts | View summary, confirm | Full COA tree (returns codeToId) |
| 4 | **Currencies & Cashboxes** *(NEW)* | View summary, confirm | SYP + USD currencies, 2 cashboxes |
| 5 | GL Defaults | Select accounts, submit | Financial settings |
| 6 | Document Sequences | Edit prefixes, submit | Document sequences |

## Backend Implementation

### `OnboardingService` changes

**Add `stepCurrencies(tenantId: string, codeToId: Record<string, string>): Promise<void>`:**

```
1. assertNotCompleted(tenantId)
2. Create SYP currency: code='SYP', name={ar:'الليرة السورية',en:'Syrian Lira'}, symbol={ar:'ل.س',en:'£'}, isBase=false
3. Create USD currency: code='USD', name={ar:'الدولار الأمريكي',en:'US Dollar'}, symbol={ar:'$',en:'$'}, isBase=true
4. Update tenant.baseCurrencyId → USD's ID
5. Lookup account 1110 from codeToId (cash account)
6. Create cashbox CASH-SYP: code='CASH-SYP', name={ar:'الصندوق الرئيسي (ل.س)',en:'Main Cash (SYP)'}, currencyId=SYP, linkedAccountId=account1110
7. Create cashbox CASH-USD: code='CASH-USD', name={ar:'صندوق الدولار',en:'USD Cash'}, currencyId=USD, linkedAccountId=account1110
8. advanceStep(tenantId, 4)
```

**Remove** dead `bootstrapCurrencies` method.

**Advance step adjustment:** step `stepCurrencies` advances to step 4. No other advanceStep values change.

### `OnboardingController` changes

Add endpoint:
```
POST /onboarding/step/currencies
Body: { codeToId: Record<string, string> }
→ 204 No Content
```

### `OnboardingModule` changes

Import `CurrenciesModule` and `CashboxesModule` (for their services).

### DTO

No new DTO needed. The existing `codeToId` pattern (same as GL Defaults) — passed as part of body with a simple type.

## API Client Changes

### `OnboardingClient`

```ts
stepCurrencies = async (codeToId: Record<string, string>): Promise<void> => {
  await this.apiClient.post('/onboarding/step/currencies' as never, { codeToId } as never)
}
```

## Dashboard Changes

### New: `components/currencies-step.tsx`

- Receives `codeToId: Record<string, string>` and `onSuccess: () => void`
- Shows summary cards for SYP and USD (code, localized name, symbol)
- Highlights USD as base currency (badge or indicator)
- Confirm button triggers `api.onboarding.stepCurrencies(codeToId)`
- Uses i18n keys

### `onboarding-wizard.tsx` changes

- STEP_TITLES: 5 → 6 items, insert `onboarding.currencies.title` at index 3
- Add step 4 rendering: `<CurrenciesStep codeToId={state.codeToId} onSuccess={...} />`
- All hardcoded strings → i18n

### `onboarding.config.ts` changes

- Add currency preview constants (SYP/USD name, symbol, code)
- Remove unused if any

## i18n

### AR translations (`packages/i18n/src/ar/business.json`)

Add `onboarding` section:

```json
"onboarding": {
  "title": "إعداد الحساب",
  "step": "الخطوة",
  "of": "من",
  "buttons": {
    "continue": "متابعة",
    "saving": "جارٍ الحفظ…",
    "confirm": "تأكيد ومتابعة",
    "complete": "إكمال الإعداد"
  },
  "company": {
    "title": "ملف الشركة",
    "name": "اسم الشركة",
    "namePlaceholder": "متجر تجريبي",
    "address": "العنوان",
    "phone": "الهاتف",
    "language": "اللغة",
    "timezone": "المنطقة الزمنية",
    "dateFormat": "صيغة التاريخ",
    "numberFormat": "صيغة الأرقام"
  },
  "fiscalYear": {
    "title": "السنة المالية",
    "name": "اسم الفترة",
    "startDate": "تاريخ البداية",
    "endDate": "تاريخ النهاية"
  },
  "chartOfAccounts": {
    "title": "دليل الحسابات",
    "description": "سنقوم بإنشاء دليل حسابات قياسي لك. يمكنك إضافة أو تعديل الحسابات لاحقاً.",
    "creating": "جارٍ إنشاء الحسابات…",
    "confirm": "تأكيد ومتابعة"
  },
  "currencies": {
    "title": "العملات والخزائن",
    "description": "العملات المدعومة في نظامك. سيتم إنشاء خزينة لكل عملة.",
    "baseIndicator": "الأساسية",
    "sypName": "الليرة السورية",
    "usdName": "الدولار الأمريكي",
    "cashbox": "الخزينة"
  },
  "glDefaults": {
    "title": "حسابات الأستاذ الافتراضية",
    "description": "هذه الحسابات تُستخدم تلقائياً عند ترحيل الفواتير والمدفوعات.",
    "salesAccount": "حساب المبيعات الافتراضي",
    "purchaseAccount": "حساب المشتريات الافتراضي",
    "taxAccount": "حساب الضريبة الافتراضي",
    "receivableAccount": "حساب المدينين الافتراضي",
    "payableAccount": "حساب الدائنين الافتراضي"
  },
  "documentSequences": {
    "title": "ترقيم المستندات",
    "description": "خصص البادئة ورقم البداية لكل نوع من المستندات."
  }
}
```

### EN translations (`packages/i18n/src/en/business.json`)

Mirror structure with English values.

### Step component changes

Replace all hardcoded strings with `const t = useTranslations('business')` and `t('onboarding.X.Y')` calls.

## Step-by-state mapping (wizard reducer)

| currentStep | Component | advanceStep value |
|-------------|-----------|-------------------|
| 1 | CompanyStep | 1 |
| 2 | FiscalYearStep | 2 |
| 3 | ChartOfAccountsStep | 3 |
| 4 *(NEW)* | CurrenciesStep | 4 |
| 5 | GlDefaultsStep | 5 |
| 6 | DocumentSequencesStep (calls complete) | 5 (complete) |

## Cashbox Details

| Code | Name (AR) | Name (EN) | Currency | Linked Account |
|------|-----------|-----------|----------|----------------|
| CASH-SYP | الصندوق الرئيسي (ل.س) | Main Cash (SYP) | SYP | 1110 (Cash) |
| CASH-USD | صندوق الدولار | USD Cash | USD | 1110 (Cash) |

## Verification

After implementation, verify:
1. `pnpm turbo run build --filter=@devloggers/api` passes
2. `pnpm turbo run build --filter=@devloggers/dashboard` passes
3. Fresh tenant onboarding creates SYP + USD currencies with USD as base
4. Fresh tenant onboarding creates both cashboxes linked to account 1110
5. AR dashboard shows all onboarding UI in Arabic
6. EN dashboard shows all onboarding UI in English
