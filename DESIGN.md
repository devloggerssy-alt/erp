---
name: DevLoggers ERP
description: Full-stack ERP for MENA SMBs — commanding operational clarity in a single workspace.
colors:
  signal-green: "oklch(77.17% 0.20466 129.029)"
  ember: "oklch(75.417% 0.14818 18.15)"
  operational-canvas: "oklch(96.416% 0.00011 271.152)"
  surface: "oklch(97.5% 0 0)"
  operator-ink: "oklch(6.2% 0 0)"
  subdued-ink: "oklch(60% 0 0)"
  grid-line: "oklch(92.2% 0 0)"
  alert-red: "oklch(57.7% 0.245 27.325)"
  dark-canvas: "oklch(14.5% 0 0)"
  dark-surface: "oklch(20.5% 0 0)"
typography:
  display:
    fontFamily: "Tajawal, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Tajawal, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
  title:
    fontFamily: "Tajawal, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Tajawal, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Tajawal, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.01em"
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.625rem"
  xl: "0.875rem"
  2xl: "1.125rem"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.signal-green}"
    textColor: "oklch(98.5% 0 0)"
    rounded: "{rounded.md}"
    padding: "0 0.625rem"
    height: "2.25rem"
  button-primary-hover:
    backgroundColor: "oklch(62% 0.18 129.029)"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.operator-ink}"
    rounded: "{rounded.md}"
    padding: "0 0.625rem"
    height: "2.25rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.operator-ink}"
    rounded: "{rounded.md}"
    height: "2.25rem"
  button-destructive:
    backgroundColor: "oklch(57.7% 0.245 27.325 / 10%)"
    textColor: "{colors.alert-red}"
    rounded: "{rounded.md}"
    height: "2.25rem"
  input-default:
    backgroundColor: "transparent"
    rounded: "{rounded.md}"
    padding: "0.25rem 0.625rem"
    height: "2.25rem"
---

# Design System: DevLoggers ERP

## 1. Overview

**Creative North Star: "The Control Tower"**

This is a system built for operators who need to see everything and act on anything without hesitation. The interface gives the business owner altitude — a commanding view over sales, inventory, finances, and operations — while keeping controls within immediate reach. Numbers are the hero. Every pixel of chrome earns its presence by serving the data it surrounds.

The brand color, Signal Green (`oklch(77.17% 0.20466 129.029)` / `#97DE00`), is not decoration. It marks where action lives: primary buttons, active nav states, key indicators. Its restraint on any given screen is what makes it effective. A lime-green glow on the primary button is a deliberate moment — the hand reaching for the trigger. Everything else is Operational Canvas and Operator Ink: high-contrast, honest, built for sustained work.

This system explicitly rejects two failure modes from PRODUCT.md: the hyped-startup aesthetic (dark terminal UIs, purple gradients, glassmorphism, neon accents) and banking conservatism (navy palettes, heavy serifs, formal stiffness). The Control Tower is neither. It is functional authority — the confidence of a professional workspace, with the directness of a product built by people who actually understand what an SMB owner in the MENA region needs on a Tuesday.

**Key Characteristics:**
- Information-dense layouts with deliberate breathing room via spacing rhythm, not white-space for its own sake
- Arabic-native: Tajawal as the sole typeface, RTL as primary flow direction, logical CSS properties throughout
- Signal Green reserved for interactive anchors and active states — never decorative
- Flat surfaces by default; lime-green glow on primary button is the signature tactile moment
- Light and dark modes are peer citizens; dark uses Ember (warm coral) as primary, not Signal Green

---

## 2. Colors: The Operator Palette

One saturated anchor color carried on a high-contrast neutral field. Every other color is functional.

### Primary
- **Signal Green** (`oklch(77.17% 0.20466 129.029)` / ~`#97DE00`): The action color. Used exclusively for primary buttons, active navigation indicators, key stats, and success states. Its rarity is the point. In light mode only.
- **Ember** (`oklch(75.417% 0.14818 18.15)` / ~`#E87050`): Dark-mode counterpart to Signal Green. Warm coral replaces the lime-green as the primary interactive anchor in dark contexts. Shares the same role; never appears in light mode.

### Neutral
- **Operational Canvas** (`oklch(96.416% 0.00011 271.152)` / ~`#F3F3F5`): Page background. A near-white with an almost imperceptible blue-neutral cast — not warm, not cream. Business-neutral.
- **Surface** (`oklch(97.5% 0 0)` / ~`#F8F8F8`): Card and sidebar backgrounds. One step lighter than the page.
- **Operator Ink** (`oklch(6.2% 0 0)` / ~`#0F0F0F`): Primary text. Near-black, not pure black — slightly softer for extended reading.
- **Subdued Ink** (`oklch(60% 0 0)` / ~`#626262`): Secondary text, metadata, helper copy. Must clear 4.5:1 against Surface; verify before use at small sizes.
- **Grid Line** (`oklch(92.2% 0 0)` / ~`#E3E3E3`): Borders, table dividers, input strokes. Light and unobtrusive.
- **Alert Red** (`oklch(57.7% 0.245 27.325)` / ~`#D63616`): Error states, destructive actions. Never used decoratively.
- **Dark Canvas** (`oklch(14.5% 0 0)` / ~`#1F1F1F`): Dark-mode page background.
- **Dark Surface** (`oklch(20.5% 0 0)` / ~`#2E2E2E`): Dark-mode card and sidebar backgrounds.

### Named Rules
**The One-Trigger Rule.** Signal Green (light) and Ember (dark) appear on primary interactive elements and active states only. If it's green and it doesn't invite action, it's wrong. Remove or convert to neutral.

**The No Cream Rule.** Operational Canvas has near-zero chroma. Any warm-tinted near-white (`hue 40–100`, `chroma > 0.02`) is categorically wrong for this system. Warmth is expressed through Ember in dark mode and through Signal Green's energy, not through a beige background.

---

## 3. Typography

**Primary Font:** Tajawal (Google Fonts) — Arabic-first humanist sans-serif covering both Arabic and Latin scripts with consistent weight matching between scripts.

**Character:** One family, full commitment. Tajawal's design bridges Arabic and Latin without compromising either. At 700 weight it reads authoritative; at 400 weight it reads legible at data-table density. No secondary display face, no decorative serif, no monospace unless displaying code.

The right-to-left script is primary. All sizing and spacing decisions must be verified in Arabic text, not just Latin.

### Hierarchy
- **Display** (700, 1.875rem / 30px, line-height 1.2, tracking -0.01em): Page-level titles and report headings. Rare — one per page at most.
- **Headline** (600, 1.5rem / 24px, line-height 1.25): Section headings, modal titles, dashboard card headers.
- **Title** (600, 1.125rem / 18px, line-height 1.3): Subsection labels, card titles, form section headers.
- **Body** (400, 0.875rem / 14px, line-height 1.5): Table cell data, form field content, list items, paragraph text. Default for the application. Line length capped at 72ch.
- **Label** (500, 0.75rem / 12px, line-height 1.4, tracking 0.01em): Form field labels, badge text, table column headers, metadata chips.

### Named Rules
**The Single Stack Rule.** Tajawal only. No secondary typeface introduced for any reason. Hierarchy is achieved through weight contrast (400 vs 600 vs 700) and size steps, never by mixing families.

**The Arabic-First Verification Rule.** Before declaring any text component or page layout complete, verify appearance with Arabic content at the longest realistic string length. If it breaks the layout, that is the bug.

---

## 4. Elevation

This system is flat by default. Surfaces rest on the page without shadows. Depth is communicated through background color differentiation (Operational Canvas → Surface → popover) and border contrast (Grid Line), not through drop shadows.

The single deliberate exception is the primary button's lime-green glow: `0 0 15px -5px oklch(77.17% 0.20466 129.029)` at rest, expanding to `0 0 20px 0px oklch(77.17% 0.20466 129.029)` on hover. This glow is not generalized to other surfaces — it belongs to the primary call-to-action exclusively.

Modal dialogs and dropdowns use a minimal ambient shadow (`0 4px 24px oklch(0% 0 0 / 12%)`) to establish separation from the page. No heavy dark shadows, no blurred backdrops as decoration.

### Shadow Vocabulary
- **Primary CTA Glow** (`0 0 15px -5px oklch(77.17% 0.20466 129.029)`, expanding to `0 0 20px 0px` on hover): Primary button only. The signature tactile moment of this system.
- **Elevation Layer** (`0 4px 24px oklch(0% 0 0 / 12%)`): Dialogs, dropdowns, sheets. Ambient; not structural.

### Named Rules
**The Flat-By-Default Rule.** Cards, panels, sidebar sections, and list items have no box-shadow at rest. If an element needs to feel elevated without a shadow, adjust background color. Shadows are reserved for state (hover on primary CTA) and portals (dialogs, dropdowns).

---

## 5. Components

### Buttons

Buttons use `rounded-md` (0.5rem / 8px radius). Default height: 36px (`h-9`). Text: 0.875rem medium.

- **Primary:** Signal Green background (`oklch(77.17% 0.20466 129.029)`), near-white text. Signature lime-green glow shadow at rest, glow expands on hover. `opacity-80` on hover (background). This is the most visually prominent element in any view — use it once per screen.
- **Outline:** Transparent background, Grid Line border, Operator Ink text. Hover: muted background (`oklch(94.9% 0 0)`). The secondary action variant.
- **Ghost:** No background, no border. Muted hover state. Used for low-emphasis actions in toolbars and table rows.
- **Destructive:** 10% Alert Red background, Alert Red text. Hover: 20% Alert Red. Used only for irreversible delete actions; always paired with a confirmation dialog.
- **Link:** Primary-colored text, underline on hover. Inline text actions only.

Size variants: `xs` (24px), `sm` (32px), default (36px), `lg` (40px). Icon-only variants mirror each size with square dimensions.

### Cards / Containers

- **Corner Style:** Gently rounded (0.625rem / 10px base radius). Smaller components use `rounded-md` (0.5rem).
- **Background:** Surface white (`oklch(97.5% 0 0)`) on Operational Canvas. In dark mode, Dark Surface (`oklch(20.5% 0 0)`) on Dark Canvas.
- **Shadow Strategy:** None at rest (see Elevation). Dialogs and portals: ambient `0 4px 24px oklch(0% 0 0 / 12%)`.
- **Border:** Grid Line (`oklch(92.2% 0 0)`), 1px. Optional — used for structural separation, not decoration.
- **Internal Padding:** `md` (1rem / 16px) standard; `lg` (1.5rem) for dashboard summary cards; `sm` (0.5rem) for compact list items.

### Inputs / Fields

- **Style:** Transparent background, Grid Line border (1px), `rounded-md` (0.5rem). Height 36px. Body text size (0.875rem).
- **Focus:** `border-ring` (neutral) + `ring-3` (3px) `ring-ring/50` (50% opacity ring). The focus indicator is neutral-colored — not green. Signal Green is reserved for actions, not states.
- **Error State:** `border-destructive` + `ring-3 ring-destructive/20`. Aria-driven; no CSS class required on the consuming component.
- **Disabled:** `opacity-50`, pointer-events none.
- **Placeholder:** Subdued Ink. Verify 4.5:1 contrast ratio against field background.

### Navigation

The sidebar carries Tajawal at body weight. Nav items use `dashboard-nav-item` class: subtle transitions on background and box-shadow, 200ms duration.

- **Default state:** Sidebar foreground text, transparent background.
- **Hover:** Muted background tint.
- **Active state:** `sidebar-nav-active-bg` (12% Signal Green mixed into sidebar background), 1px inset border at 28% Signal Green opacity, active icon at 74% Signal Green mix. The lime-green bleeds into the sidebar without overwhelming it.
- **Collapsed state:** Icon-only, centered. Labels hidden but accessible via tooltip.

Nested nav groups use indented sub-items (`dashboard-nav-sub-item`) with the same active treatment.

### Data Tables

TanStack Table with custom `DataTable` shell. Column headers use `ColumnHeader` (sortable, with i18n sort menu). Boolean fields render as `BooleanCell` badge — never raw `true`/`false`. Row actions via `actionsColumn()` dropdown.

- **Row styling:** Alternating subtle background tint optional; borders via Grid Line separators.
- **Pagination:** Built into `DataTable`; uses Label-scale text.
- **Empty state:** `Empty` component with centered message; never a blank table shell.

### Badges / Status Chips

Small, rounded (`rounded-full` or `rounded-md`), Label-scale text. Boolean states (`BooleanCell`) show Active/Inactive distinction via color. No raw booleans in the UI.

---

## 6. Do's and Don'ts

### Do:
- **Do** use Signal Green exclusively for primary buttons, active nav indicators, and key action anchors. One per screen.
- **Do** verify every text element's contrast ratio: body text ≥ 4.5:1 against its background, including Subdued Ink at small sizes.
- **Do** use logical CSS properties (`padding-inline-start`, `margin-inline-end`, `text-align: start`) everywhere. Never `padding-left`/`right` or `text-align: left`/`right` unless intentionally overriding RTL direction.
- **Do** verify layouts and typography with realistic Arabic content — longest expected strings, mixed-direction labels, right-to-left flow.
- **Do** keep primary buttons at one per screen. If two actions compete equally, one of them is wrong.
- **Do** use `BooleanCell` for all boolean columns in data tables. Raw `true` / `false` strings are forbidden in rendered UI.
- **Do** extend `shared/data-view/` for table and resource UI changes. Never style tables inside module files.
- **Do** cap line length at 72ch for paragraph content (help text, descriptions, empty state messages).
- **Do** include `@media (prefers-reduced-motion: reduce)` alternatives for any animation — crossfade or instant transition minimum.

### Don't:
- **Don't** use a warm-tinted near-white (`hue 40–100, chroma > 0.02`) as a background. Operational Canvas is neutral. "Warmth" in this system comes from Ember in dark mode, not beige backgrounds.
- **Don't** build a hyped-startup interface (PRODUCT.md anti-reference): no dark-mode-first design, no terminal aesthetic, no purple/violet gradients, no glassmorphism, no neon accents, no dev-tool-inspired chrome.
- **Don't** build a banking/fintech-conservative interface (PRODUCT.md anti-reference): no heavy serif display faces, no navy-and-gold color schemes, no formal stiffness that makes the product feel inaccessible.
- **Don't** apply the Signal Green glow (`0 0 15px -5px oklch(77.17% 0.20466 129.029)`) to any element other than the primary button. That glow is a singular tactile moment, not a general hover treatment.
- **Don't** use gradient text (`background-clip: text` with a gradient). Single solid color for all text.
- **Don't** put a colored `border-left` or `border-right` greater than 1px as a stripe accent on cards or list items. Use background tint or a full border instead.
- **Don't** mix typefaces. Tajawal is the single font stack. No secondary display face, no monospace decorations outside code blocks.
- **Don't** render raw boolean values (`true`, `false`) in data tables. Always use `BooleanCell`.
- **Don't** repeat the primary button at the bottom of long forms and at the top — pick one placement and own it.
- **Don't** hardcode `left` / `right` in CSS or component props. Every directional value must use logical properties to support RTL without patching.
