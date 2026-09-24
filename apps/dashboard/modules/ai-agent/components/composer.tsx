"use client"

import { SendIcon, SquareIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, type KeyboardEvent } from "react"
import { Button } from "@/shared/components/ui/button"
import { Textarea } from "@/shared/components/ui/textarea"

const MAX_LENGTH = 8000

export function Composer({ disabled, busy, onSend, onStop }: { disabled: boolean; busy: boolean; onSend: (text: string) => void; onStop: () => void }) {
    const t = useTranslations("business.aiAgent")
    const [text, setText] = useState("")
    const canSend = !disabled && !busy && text.trim().length > 0

    const send = () => {
        if (!canSend) return
        onSend(text.trim())
        setText("")
    }

    const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault()
            send()
        }
    }

    return (
        <div className="border-t p-3">
            {disabled && <p className="mb-2 text-xs text-muted-foreground">{t("pendingApprovalHint")}</p>}
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
