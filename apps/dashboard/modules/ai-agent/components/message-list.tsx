"use client"

import type { UIMessage } from "ai"
import { useVirtualizer } from "@tanstack/react-virtual"
import { ArrowDownIcon, Loader2Icon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { Button } from "@/shared/components/ui/button"
import type { ApprovalResponse } from "../ai-agent.types"
import { MessageItem } from "./message-item"

const BOTTOM_THRESHOLD_PX = 80
const TOP_LOAD_THRESHOLD_PX = 200

type Props = {
    messages: UIMessage[]
    isStreaming: boolean
    hasOlder: boolean
    isLoadingOlder: boolean
    onLoadOlder: () => void
    onApprovalResponse: (response: ApprovalResponse) => void
    error?: Error
}

/** Changes whenever the last message grows (streamed text, new part, state change). */
function tailSignature(messages: UIMessage[]): string {
    const last = messages[messages.length - 1]
    if (!last) return ""
    const lastPart = last.parts[last.parts.length - 1]
    const size = lastPart?.type === "text" ? lastPart.text.length : 0
    const state = lastPart && "state" in lastPart ? String(lastPart.state) : ""
    return `${last.id}:${last.parts.length}:${size}:${state}`
}

export function MessageList({ messages, isStreaming, hasOlder, isLoadingOlder, onLoadOlder, onApprovalResponse, error }: Props) {
    const t = useTranslations("business.aiAgent")
    const scrollRef = useRef<HTMLDivElement>(null)
    const atBottomRef = useRef(true)
    const [showJump, setShowJump] = useState(false)
    const anchorRef = useRef<{ id: string; delta: number } | null>(null)

    const virtualizer = useVirtualizer({
        count: messages.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => 120,
        overscan: 6,
        getItemKey: (index) => messages[index]?.id ?? index,
    })

    const scrollToBottom = useCallback(() => {
        if (messages.length > 0) virtualizer.scrollToIndex(messages.length - 1, { align: "end" })
    }, [messages.length, virtualizer])

    // Stick to bottom while new content arrives, unless the user scrolled up.
    const signature = tailSignature(messages)
    useEffect(() => {
        if (atBottomRef.current) scrollToBottom()
        else setShowJump(true)
    }, [signature, scrollToBottom])

    // Keep the first visible message in place when older pages are prepended.
    useLayoutEffect(() => {
        const anchor = anchorRef.current
        if (!anchor) return
        const index = messages.findIndex((message) => message.id === anchor.id)
        if (index > 0) {
            const [offset] = virtualizer.getOffsetForIndex(index, "start") ?? [0]
            virtualizer.scrollToOffset(offset + anchor.delta)
        }
        anchorRef.current = null
    }, [messages, virtualizer])

    const onScroll = () => {
        const el = scrollRef.current
        if (!el) return
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD_PX
        atBottomRef.current = atBottom
        if (atBottom) setShowJump(false)
        if (el.scrollTop < TOP_LOAD_THRESHOLD_PX && hasOlder && !isLoadingOlder) {
            const first = virtualizer.getVirtualItems()[0]
            const firstMessage = first ? messages[first.index] : undefined
            if (first && firstMessage) anchorRef.current = { id: firstMessage.id, delta: el.scrollTop - first.start }
            onLoadOlder()
        }
    }

    return (
        <div className="relative min-h-0 flex-1">
            <div ref={scrollRef} onScroll={onScroll} className="h-full overflow-y-auto" role="log" aria-live="polite">
                {isLoadingOlder && (
                    <div className="flex justify-center py-2">
                        <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
                    </div>
                )}
                {messages.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">{t("startHint")}</p>}
                <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
                    {virtualizer.getVirtualItems().map((row) => {
                        const message = messages[row.index]
                        if (!message) return null
                        return (
                            <div
                                key={row.key}
                                data-index={row.index}
                                ref={virtualizer.measureElement}
                                className="absolute inset-x-0 top-0"
                                style={{ transform: `translateY(${row.start}px)` }}
                            >
                                <MessageItem message={message} onApprovalResponse={onApprovalResponse} />
                            </div>
                        )
                    })}
                </div>
                {isStreaming && (
                    <div className="px-4 py-2">
                        <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
                    </div>
                )}
                {error && <p className="px-4 py-2 text-sm text-destructive">{t("streamError")}</p>}
            </div>
            {showJump && (
                <Button
                    size="sm"
                    variant="secondary"
                    className="absolute bottom-3 start-1/2 -translate-x-1/2 gap-1 shadow rtl:translate-x-1/2"
                    onClick={() => {
                        atBottomRef.current = true
                        setShowJump(false)
                        scrollToBottom()
                    }}
                >
                    <ArrowDownIcon className="size-4" />
                    {t("newMessages")}
                </Button>
            )}
        </div>
    )
}
