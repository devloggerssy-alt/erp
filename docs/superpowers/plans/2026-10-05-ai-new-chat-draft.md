# AI Agent — ChatGPT-style New Chat Draft — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/ai` shows a centered heading + composer; no `ai_conversations` row is created until the first message is submitted, at which point the conversation is created, entered, and the message is sent.

**Architecture:** Draft form + one-shot first-message handoff. `NewChatView` creates the conversation on submit, stores the text in a module-level map, and `router.replace`s to `/ai/:id`; `ChatSession` consumes the pending text on mount and sends it through the existing `useChat` transport. No API, contracts, routing, or DB changes.

**Tech Stack:** Next.js 16 App Router, React 19, AI SDK v7 (`useChat`, `DefaultChatTransport`), TanStack Query v5, next-intl, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-05-ai-new-chat-draft-design.md`

## Global Constraints

- Scope is `apps/dashboard/modules/ai-agent/**` and `packages/i18n/src/{en,ar,tr}/business.json`. No changes to Prisma, `apps/api`, `packages/api-contracts`, or `packages/api-client`.
- No new dependencies; no `as any` / `@ts-ignore` / `@ts-expect-error`.
- Dashboard UI text must come from `business.aiAgent.*` in all three locales (en, ar, tr); use logical CSS (`start`/`end`, `border-e`) and keep `dir="auto"` on the composer textarea.
- Formatting matches the files: 4-space indentation, double quotes, no semicolons in `apps/dashboard`, trailing commas.
- Verification commands:
  - `pnpm --filter @devloggers/dashboard test:unit`
  - `pnpm --filter @devloggers/dashboard lint`
  - `pnpm --filter @devloggers/dashboard typecheck`
  - `pnpm turbo run build --filter=@devloggers/dashboard`
  - `pnpm --filter @devloggers/i18n build`
- Commit steps are gated on operator approval (this workspace defaults to no unprompted commits). If commits are approved, use the message shown in each task.

---

### Task 1: Pending first-message store

**Files:**
- Create: `apps/dashboard/modules/ai-agent/pending-first-message.ts`
- Test: `apps/dashboard/modules/ai-agent/pending-first-message.test.ts`

**Interfaces:**
- Produces: `setPendingFirstMessage(conversationId: string, text: string): void`
- Produces: `takePendingFirstMessage(conversationId: string): string | null` — returns the text exactly once; returns `null` if absent or older than 15s.

- [ ] **Step 1: Write the failing test**

```ts
// apps/dashboard/modules/ai-agent/pending-first-message.test.ts
import { afterEach, describe, expect, it, vi } from "vitest"
import { setPendingFirstMessage, takePendingFirstMessage } from "./pending-first-message"

describe("pending-first-message", () => {
    afterEach(() => {
        vi.useRealTimers()
    })

    it("returns the text once, then null", () => {
        setPendingFirstMessage("conversation-1", "hello")
        expect(takePendingFirstMessage("conversation-1")).toBe("hello")
        expect(takePendingFirstMessage("conversation-1")).toBeNull()
    })

    it("returns null for an unknown conversation", () => {
        expect(takePendingFirstMessage("missing")).toBeNull()
    })

    it("drops entries older than the TTL", () => {
        vi.useFakeTimers()
        setPendingFirstMessage("conversation-1", "hello")
        vi.advanceTimersByTime(15_001)
        expect(takePendingFirstMessage("conversation-1")).toBeNull()
    })
})
```

- [ ] **Step 2: Run the test — expect FAIL**

Run: `pnpm --filter @devloggers/dashboard exec vitest run modules/ai-agent/pending-first-message.test.ts`

Expected: FAIL — `Cannot find module './pending-first-message'` (or equivalent resolution error).

- [ ] **Step 3: Implement the store**

```ts
// apps/dashboard/modules/ai-agent/pending-first-message.ts
const PENDING_TTL_MS = 15_000

type PendingFirstMessage = { text: string; at: number }

const pending = new Map<string, PendingFirstMessage>()

export function setPendingFirstMessage(conversationId: string, text: string): void {
    pending.set(conversationId, { text, at: Date.now() })
}

export function takePendingFirstMessage(conversationId: string): string | null {
    const entry = pending.get(conversationId)
    if (!entry) return null
    pending.delete(conversationId)
    return Date.now() - entry.at > PENDING_TTL_MS ? null : entry.text
}
```

- [ ] **Step 4: Run the test — expect PASS**

Run: `pnpm --filter @devloggers/dashboard exec vitest run modules/ai-agent/pending-first-message.test.ts`

Expected: `Test Files 1 passed`, `Tests 3 passed`.

- [ ] **Step 5: Commit (gated on operator approval)**

```bash
git add apps/dashboard/modules/ai-agent/pending-first-message.ts apps/dashboard/modules/ai-agent/pending-first-message.test.ts
git commit -m "feat(ai-agent): add pending first-message store"
```

---

### Task 2: i18n strings

**Files:**
- Modify: `packages/i18n/src/en/business.json:1424`
- Modify: `packages/i18n/src/ar/business.json:1518`
- Modify: `packages/i18n/src/tr/business.json:1350`

**Interfaces:**
- Produces: `business.aiAgent.newChatTitle` and `business.aiAgent.openConversations` in en/ar/tr, consumed by Tasks 4 and 7.
- Note: `emptyState` is removed later in Task 7 (after its last usage is deleted) to keep the plan always runnable.

- [ ] **Step 1: Add the keys to `packages/i18n/src/en/business.json`**

Replace:

```json
    "emptyState": "Select a conversation or start a new one",
```

with:

```json
    "newChatTitle": "How can I help you today?",
    "openConversations": "Open conversations",
    "emptyState": "Select a conversation or start a new one",
```

- [ ] **Step 2: Add the keys to `packages/i18n/src/ar/business.json`**

Replace:

```json
    "emptyState": "اختر محادثة أو ابدأ محادثة جديدة",
```

with:

```json
    "newChatTitle": "كيف يمكنني مساعدتك اليوم؟",
    "openConversations": "فتح المحادثات",
    "emptyState": "اختر محادثة أو ابدأ محادثة جديدة",
```

- [ ] **Step 3: Add the keys to `packages/i18n/src/tr/business.json`**

Replace:

```json
    "emptyState": "Bir sohbet seçin veya yeni bir sohbet başlatın",
```

with:

```json
    "newChatTitle": "Bugün size nasıl yardımcı olabilirim?",
    "openConversations": "Sohbetleri aç",
    "emptyState": "Bir sohbet seçin veya yeni bir sohbet başlatın",
```

- [ ] **Step 4: Verify the package builds**

Run: `pnpm --filter @devloggers/i18n build`

Expected: exits 0.

- [ ] **Step 5: Commit (gated on operator approval)**

```bash
git add packages/i18n/src/en/business.json packages/i18n/src/ar/business.json packages/i18n/src/tr/business.json
git commit -m "feat(ai-agent): add new-chat i18n strings"
```

---

### Task 3: Controlled composer + external hint

**Files:**
- Modify: `apps/dashboard/modules/ai-agent/components/composer.tsx` (whole component)
- Modify: `apps/dashboard/modules/ai-agent/components/chat-view.tsx:14-51` (`ChatSession` only)

**Interfaces:**
- Consumes: nothing new.
- Produces: `Composer` props `value?: string`, `onValueChange?: (value: string) => void`, `hint?: string`. In controlled mode the parent owns the text (the composer no longer clears it). `hint` replaces the internal `pendingApprovalHint` render.

- [ ] **Step 1: Rewrite `composer.tsx`**

```tsx
"use client"

import { SendIcon, SquareIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, type KeyboardEvent } from "react"
import { Button } from "@/shared/components/ui/button"
import { Textarea } from "@/shared/components/ui/textarea"

const MAX_LENGTH = 8000

export function Composer({
    disabled,
    busy,
    onSend,
    onStop,
    value,
    onValueChange,
    hint,
}: {
    disabled: boolean
    busy: boolean
    onSend: (text: string) => void
    onStop: () => void
    value?: string
    onValueChange?: (value: string) => void
    hint?: string
}) {
    const t = useTranslations("business.aiAgent")
    const [innerText, setInnerText] = useState("")
    const text = value ?? innerText
    const canSend = !disabled && !busy && text.trim().length > 0

    const setText = (next: string) => {
        if (onValueChange) onValueChange(next)
        else setInnerText(next)
    }

    const send = () => {
        if (!canSend) return
        onSend(text.trim())
        if (!onValueChange) setInnerText("")
    }

    const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault()
            send()
        }
    }

    return (
        <div className="border-t p-3">
            {hint && <p className="mb-2 text-xs text-muted-foreground">{hint}</p>}
            <div className="flex items-end gap-2">
                <Textarea
                    value={text}
                    onChange={(event) => setText(event.target.value.slice(0, MAX_LENGTH))}
                    onKeyDown={onKeyDown}
                    placeholder={t("composerPlaceholder")}
                    disabled={disabled}
                    rows={1}
                    className="max-h-40 min-h-10 resize-none"
                    dir="auto"
                />
                {busy ? (
                    <Button size="icon" variant="secondary" onClick={onStop} aria-label={t("stop")}>
                        <SquareIcon className="size-4" />
                    </Button>
                ) : (
                    <Button size="icon" onClick={send} disabled={!canSend} aria-label={t("send")}>
                        <SendIcon className="size-4 rtl:-scale-x-100" />
                    </Button>
                )}
            </div>
        </div>
    )
}
```

- [ ] **Step 2: Update `ChatSession` to pass the hint**

In `chat-view.tsx`, add translations and the `hint` prop. Replace the top of `ChatSession` (currently `chat-view.tsx:14-23`):

```tsx
function ChatSession({
    conversationId,
    initialMessages,
    history,
}: {
    conversationId: string
    initialMessages: UIMessage[]
    history: ReturnType<typeof useConversationHistory>
}) {
    const t = useTranslations("business.aiAgent")
    const chat = useAgentChat({ conversationId, initialMessages })
```

and replace the `<Composer … />` block (currently `chat-view.tsx:43-48`) with:

```tsx
            <Composer
                disabled={pending}
                busy={busy}
                hint={pending ? t("pendingApprovalHint") : undefined}
                onSend={(text) => void chat.sendMessage({ text })}
                onStop={() => void chat.stop()}
            />
```

`useTranslations` is already imported at the top of the file.

- [ ] **Step 3: Typecheck and lint**

Run: `pnpm --filter @devloggers/dashboard typecheck; if ($?) { pnpm --filter @devloggers/dashboard lint }`

Expected: both exit 0.

- [ ] **Step 4: Commit (gated on operator approval)**

```bash
git add apps/dashboard/modules/ai-agent/components/composer.tsx apps/dashboard/modules/ai-agent/components/chat-view.tsx
git commit -m "feat(ai-agent): support controlled composer and external hint"
```

---

### Task 4: New chat draft view

**Files:**
- Create: `apps/dashboard/modules/ai-agent/components/new-chat-view.tsx`

**Interfaces:**
- Consumes: `setPendingFirstMessage` (Task 1); `Composer` controlled props (Task 3); `business.aiAgent.newChatTitle` / `business.aiAgent.openConversations` (Task 2); `useConversationMutations().create` (`apps/dashboard/modules/ai-agent/hooks/use-conversations.ts:28`).
- Produces: `NewChatView({ onOpenList }: { onOpenList?: () => void })`, consumed by Task 7.

- [ ] **Step 1: Create the component**

```tsx
// apps/dashboard/modules/ai-agent/components/new-chat-view.tsx
"use client"

import { PanelLeftIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"
import { useRouter } from "@/i18n/navigation"
import { Button } from "@/shared/components/ui/button"
import { toastErrorMessage } from "@/shared/lib/utils"
import { useConversationMutations } from "../hooks/use-conversations"
import { setPendingFirstMessage } from "../pending-first-message"
import { Composer } from "./composer"

export function NewChatView({ onOpenList }: { onOpenList?: () => void }) {
    const t = useTranslations("business.aiAgent")
    const router = useRouter()
    const { create } = useConversationMutations()
    const [text, setText] = useState("")

    const send = async (value: string) => {
        try {
            const created = await create.mutateAsync()
            const id = created.data?.id
            if (!id) {
                toast.error(t("actionFailed"))
                return
            }
            setPendingFirstMessage(id, value)
            setText("")
            router.replace(`/ai/${id}`)
        } catch (error) {
            toast.error(toastErrorMessage(error, t("actionFailed")))
        }
    }

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col">
            {onOpenList && (
                <div className="p-2 md:hidden">
                    <Button variant="ghost" size="icon" onClick={onOpenList} aria-label={t("openConversations")}>
                        <PanelLeftIcon className="size-4" />
                    </Button>
                </div>
            )}
            <div className="flex flex-1 items-center justify-center p-4">
                <div className="w-full max-w-2xl space-y-4">
                    <h1 className="text-center text-2xl font-semibold">{t("newChatTitle")}</h1>
                    <Composer
                        value={text}
                        onValueChange={setText}
                        disabled={create.isPending}
                        busy={false}
                        onSend={(message) => void send(message)}
                        onStop={() => undefined}
                    />
                </div>
            </div>
        </div>
    )
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm --filter @devloggers/dashboard typecheck; if ($?) { pnpm --filter @devloggers/dashboard lint }`

Expected: both exit 0.

- [ ] **Step 3: Commit (gated on operator approval)**

```bash
git add apps/dashboard/modules/ai-agent/components/new-chat-view.tsx
git commit -m "feat(ai-agent): add centered new-chat draft view"
```

---

### Task 5: Send the pending first message on session mount

**Files:**
- Modify: `apps/dashboard/modules/ai-agent/components/chat-view.tsx:1-23` (imports + inside `ChatSession`)

**Interfaces:**
- Consumes: `takePendingFirstMessage` (Task 1).
- Produces: no new exports; behavior only.

- [ ] **Step 1: Add the mount effect**

Update the React import at `chat-view.tsx:5` from:

```tsx
import { useMemo } from "react"
```

to:

```tsx
import { useEffect, useMemo, useRef } from "react"
```

Add the store import after the `useAgentChat` import (`chat-view.tsx:8`):

```tsx
import { takePendingFirstMessage } from "../pending-first-message"
```

Insert inside `ChatSession`, immediately after `const chat = useAgentChat({ conversationId, initialMessages })`:

```tsx
    const sentPending = useRef(false)

    useEffect(() => {
        if (sentPending.current) return
        sentPending.current = true
        const text = takePendingFirstMessage(conversationId)
        if (text) void chat.sendMessage({ text })
    }, [chat, conversationId])
```

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm --filter @devloggers/dashboard typecheck; if ($?) { pnpm --filter @devloggers/dashboard lint }`

Expected: both exit 0. (If `react-hooks/exhaustive-deps` warns, keep `[chat, conversationId]` — the `useRef` guard makes re-runs harmless.)

- [ ] **Step 3: Commit (gated on operator approval)**

```bash
git add apps/dashboard/modules/ai-agent/components/chat-view.tsx
git commit -m "feat(ai-agent): send pending first message on session mount"
```

---

### Task 6: Route "New conversation" to the draft

**Files:**
- Modify: `apps/dashboard/modules/ai-agent/components/conversation-list.tsx:18-55`

**Interfaces:**
- Produces: `ConversationList` prop `onNew?: () => void`; when provided it replaces the default `router.push("/ai")`, consumed by Task 7.
- Removes: create mutation usage from this component (creation now happens in `NewChatView`).

- [ ] **Step 1: Update the component**

Replace the signature and the `onNew` handler (`conversation-list.tsx:18-32`):

```tsx
export function ConversationList({ activeId, onNew }: { activeId?: string; onNew?: () => void }) {
    const t = useTranslations("business.aiAgent")
    const router = useRouter()
    const conversations = useConversations()
    const { rename, remove } = useConversationMutations()
    const items = conversations.data?.pages.flatMap((page) => page.data?.items ?? []) ?? []

    const handleNew = () => {
        if (onNew) onNew()
        else router.push("/ai")
    }
```

Replace the new-conversation button (`conversation-list.tsx:52-55`) with:

```tsx
            <Button onClick={handleNew} className="w-full justify-start gap-2">
                <PlusIcon className="size-4" />
                {t("newConversation")}
            </Button>
```

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm --filter @devloggers/dashboard typecheck; if ($?) { pnpm --filter @devloggers/dashboard lint }`

Expected: both exit 0.

- [ ] **Step 3: Commit (gated on operator approval)**

```bash
git add apps/dashboard/modules/ai-agent/components/conversation-list.tsx
git commit -m "feat(ai-agent): route new conversation to the draft screen"
```

---

### Task 7: Draft layout + mobile list toggle + drop dead i18n key

**Files:**
- Modify: `apps/dashboard/modules/ai-agent/components/ai-agent-page.tsx` (whole file)
- Modify: `packages/i18n/src/en/business.json`
- Modify: `packages/i18n/src/ar/business.json`
- Modify: `packages/i18n/src/tr/business.json`

**Interfaces:**
- Consumes: `NewChatView` (Task 4); `ConversationList.onNew` (Task 6).
- Produces: `/ai` (no `conversationId`) renders `NewChatView` on desktop and a mobile draft/list toggle.

- [ ] **Step 1: Rewrite `ai-agent-page.tsx`**

```tsx
// apps/dashboard/modules/ai-agent/components/ai-agent-page.tsx
"use client"

import { useState } from "react"
import { useRouter } from "@/i18n/navigation"
import { ConversationList } from "./conversation-list"
import { ChatView } from "./chat-view"
import { NewChatView } from "./new-chat-view"

/** Header (`DashboardHeader`) is `h-12`; the chat fills the rest of the viewport. */
export function AiAgentPage({ conversationId }: { conversationId?: string }) {
    const router = useRouter()
    const [mobileListOpen, setMobileListOpen] = useState(false)

    if (conversationId) {
        return (
            <div className="flex h-[calc(100dvh-3rem)] min-h-0 flex-col md:flex-row">
                <div className="hidden md:flex">
                    <ConversationList activeId={conversationId} />
                </div>
                <ChatView conversationId={conversationId} />
            </div>
        )
    }

    return (
        <div className="flex h-[calc(100dvh-3rem)] min-h-0 flex-col md:flex-row">
            <div className={mobileListOpen ? "flex flex-1 md:flex-none" : "hidden md:flex"}>
                <ConversationList
                    onNew={() => {
                        setMobileListOpen(false)
                        router.push("/ai")
                    }}
                />
            </div>
            <div className={mobileListOpen ? "hidden md:flex md:flex-1" : "flex flex-1"}>
                <NewChatView onOpenList={() => setMobileListOpen(true)} />
            </div>
        </div>
    )
}
```

- [ ] **Step 2: Remove the now-unused `emptyState` key from all three locales**

In `packages/i18n/src/en/business.json`, delete the line:

```json
    "emptyState": "Select a conversation or start a new one",
```

In `packages/i18n/src/ar/business.json`, delete the line:

```json
    "emptyState": "اختر محادثة أو ابدأ محادثة جديدة",
```

In `packages/i18n/src/tr/business.json`, delete the line:

```json
    "emptyState": "Bir sohbet seçin veya yeni bir sohbet başlatın",
```

- [ ] **Step 3: Confirm no usage remains**

Run:

```powershell
Get-ChildItem -Path "apps\dashboard\modules" -Recurse -Include *.ts,*.tsx | Select-String -Pattern "emptyState"
```

Expected: no output.

- [ ] **Step 4: Typecheck, lint, i18n build**

Run: `pnpm --filter @devloggers/dashboard typecheck; if ($?) { pnpm --filter @devloggers/dashboard lint }; if ($?) { pnpm --filter @devloggers/i18n build }`

Expected: all exit 0.

- [ ] **Step 5: Commit (gated on operator approval)**

```bash
git add apps/dashboard/modules/ai-agent/components/ai-agent-page.tsx packages/i18n/src/en/business.json packages/i18n/src/ar/business.json packages/i18n/src/tr/business.json
git commit -m "feat(ai-agent): draft layout with mobile list toggle"
```

---

### Task 8: Refresh conversation history on revisit

**Files:**
- Modify: `apps/dashboard/modules/ai-agent/hooks/use-agent-chat.ts`

**Interfaces:**
- Consumes: `conversationKeys.messages(id)` (`hooks/use-conversations.ts:10`).
- Produces: no new exports; when a chat session unmounts, its message query is marked stale with `refetchType: "none"` so the next mount refetches persisted messages.

- [ ] **Step 1: Add the unmount cleanup**

Update the React import at `use-agent-chat.ts:5` from:

```ts
import { useMemo } from "react"
```

to:

```ts
import { useEffect, useMemo } from "react"
```

Insert after the `transport` memo (`use-agent-chat.ts:15`):

```ts
    useEffect(
        () => () => {
            void queryClient.invalidateQueries({ queryKey: conversationKeys.messages(conversationId), refetchType: "none" })
        },
        [queryClient, conversationId],
    )
```

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm --filter @devloggers/dashboard typecheck; if ($?) { pnpm --filter @devloggers/dashboard lint }`

Expected: both exit 0.

- [ ] **Step 3: Commit (gated on operator approval)**

```bash
git add apps/dashboard/modules/ai-agent/hooks/use-agent-chat.ts
git commit -m "fix(ai-agent): refresh conversation history on revisit"
```

---

### Task 9: Final verification

**Files:**
- No source changes expected. Fix any failures in the file that caused them.

- [ ] **Step 1: Run all gates**

Run:

```bash
pnpm --filter @devloggers/dashboard test:unit
pnpm --filter @devloggers/dashboard lint
pnpm --filter @devloggers/dashboard typecheck
pnpm turbo run build --filter=@devloggers/dashboard
pnpm --filter @devloggers/i18n build
```

Expected: every command exits 0.

- [ ] **Step 2: Manual smoke test**

Start: `pnpm dev` (dashboard + API), sign in, open `/ai`.

- [ ] Load `/ai`: heading + centered composer visible; `ai_conversations` gains no row (check the sidebar, or Prisma Studio).
- [ ] Click "New conversation" from an open chat: navigates to the draft; still no row.
- [ ] Submit from the draft: a row appears, the user message and assistant reply are persisted, and the sidebar title derives from the submitted text.
- [ ] Navigate to another conversation and back: the full turn is visible (history refetch on revisit).
- [ ] Stop the API, submit from the draft: error toast shown, text remains in the composer.
- [ ] Narrow the viewport to mobile: draft shows by default, list button opens the list, "New conversation" returns to the draft, selecting a conversation opens the chat.
- [ ] Switch to ar (RTL): heading and centered composer render correctly; send button icon mirrors.

- [ ] **Step 3: Commit (gated on operator approval)**

```bash
git add apps/dashboard packages/i18n/src
git commit -m "chore(ai-agent): final verification for new-chat draft flow"
```

---

## Self-Review Notes

- Spec coverage: draft screen + heading (Tasks 4, 7), no DB row until submit (Tasks 4, 6), create → navigate → auto-send (Tasks 4, 5), text preserved on failure (Tasks 3, 4), revisit history fix (Task 8), mobile toggle (Tasks 4, 7), i18n (Tasks 2, 7). Non-goals untouched.
- Sequencing keeps every intermediate state runnable: `emptyState` is removed only in Task 7, after its usage is deleted in the same task.
- Type consistency: `setPendingFirstMessage` / `takePendingFirstMessage` names and signatures match between Tasks 1, 4, 5; `Composer` props `value` / `onValueChange` / `hint` match between Tasks 3 and 4; `NewChatView.onOpenList` and `ConversationList.onNew` match between Tasks 4, 6, 7.
