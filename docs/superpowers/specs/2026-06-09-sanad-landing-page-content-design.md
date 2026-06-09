# Sanad Landing Page — Arabic Content Spec

**Date:** 2026-06-09
**Language:** Arabic only (path-based localization, e.g. `/ar`)
**Primary CTA:** Register link
**Target market:** Syrian SMB owners — wholesalers, auto parts dealers, retail stores, clothing stores, supermarkets

---

## Context

Sanad (سَند) is a full-stack ERP system built for the Syrian market. The landing page must speak directly to Syrian business owners' real pain points before introducing features. The copy follows a **problem-first narrative**: surface the frustration → show the solution → lower the barrier to register.

**Key differentiators to highlight:**
- Multi-currency (SYP + USD in the same system)
- Mobile-first — generate invoices from phone immediately
- AI assistant — helps non-technical users navigate the system
- Local Syrian payment methods: Sham Cash, Syriatel Cash
- Affordable, no IT team needed, starts today

---

## Page Sections

### 1. Hero

| Element | Arabic copy |
|---|---|
| Headline | سَند — برنامج إدارة الأعمال للتاجر السوري |
| Subheadline | فواتير فورية من هاتفك، دعم الليرة والدولار، ومساعد ذكي يساعدك حتى لو ما عندك خبرة محاسبية. |
| CTA Button | سجّل الآن مجاناً ← |

---

### 2. Pain Points — "نعرف تحديات تجارتك"

Section title: **نعرف تحديات تجارتك**

| # | Card title | Card body |
|---|---|---|
| 1 | السعر بالليرة ولا بالدولار؟ | تسعير البضاعة بعملتين يدوياً مرهق ويسبب أخطاء كل يوم. |
| 2 | فواتير على ورق أو واتساب | لا أرشيف، لا تتبع، ولا احترافية أمام العميل. |
| 3 | البرامج التقنية مو لنا | أغلب الأنظمة تحتاج خبير IT وأسابيع تدريب. |
| 4 | شام كاش وسيريا تيل كاش | كيف تسجّل الدفعات الرقمية مع باقي حساباتك؟ |

---

### 3. Features — "سَند يحلّها كلها"

Section title: **لكل مشكلة — حل واضح**

| Feature key | Title | Body |
|---|---|---|
| multi-currency | ليرة ودولار في نفس الوقت | سعّر بضاعتك بأكثر من عملة وتابع كل حركة مالية بدقة. |
| mobile-invoicing | فاتورة احترافية في ثوانٍ | أصدر فواتيرك من أي مكان بدون كمبيوتر. |
| ai-assistant | اسأل سَند | مساعد ذكاء اصطناعي يرشدك ويجاوب أسئلتك حتى بدون خبرة محاسبية. |
| local-payments | شام كاش وسيريا تيل كاش | سجّل كل مدفوعاتك الرقمية مباشرة في النظام. |
| inventory | بضاعتك تحت السيطرة | راقب مخزونك في جميع المستودعات لحظة بلحظة. |
| reports | قرارات مبنية على أرقام | شوف مبيعاتك وأرباحك وحركة المخزون في أي وقت. |

---

### 4. How It Works — "ابدأ في 3 خطوات"

Section title: **ابدأ في 3 خطوات**

| Step | Title | Body |
|---|---|---|
| 1 | سجّل حسابك | مجاناً وبدون أي خبرة تقنية |
| 2 | أدخل بضاعتك وعملاءك | سَند يرشدك خطوة بخطوة |
| 3 | ابدأ بالفوترة فوراً | من هاتفك أو الكمبيوتر |

---

### 5. Mobile + Local Payments Callout

| Element | Arabic copy |
|---|---|
| Section title | كل شيء من هاتفك |
| Body | سَند يعمل على هاتفك مباشرة. أصدر فاتورة، تحقق من مخزونك، واستلم دفعات شام كاش وسيريا تيل كاش — كل شيء من مكان واحد، في أي وقت، وأينما كنت. |

---

### 6. Affordability Strip

| Element | Arabic copy |
|---|---|
| Headline | بدون تعقيد. بدون تكاليف عالية. جاهز اليوم. |
| Body | لا تحتاج فريق تقنية. لا تحتاج تدريب طويل. فقط سجّل وابدأ. |

---

### 7. Final CTA

| Element | Arabic copy |
|---|---|
| Headline | جاهز تنظّم تجارتك؟ |
| Body | انضم إلى التجار السوريين الذين يديرون أعمالهم بذكاء مع سَند. |
| CTA Button | سجّل الآن مجاناً ← |

---

## Notes for Implementation

- All text is RTL (`dir="rtl"`)
- Page lives under `/ar` route (path-based localization)
- Feature keys in Section 3 map to ERP module names in `navGroups.tsx`
- "سَند" brand name always uses the diacritic (فتحة على السين)
- CTA button links to the registration route
