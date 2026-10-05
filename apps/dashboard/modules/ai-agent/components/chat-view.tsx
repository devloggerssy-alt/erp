"use client"

import type { UIMessage } from "ai"
import { RefreshCwIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useMemo, useRef } from "react"
import { Button } from "@/shared/components/ui/button"
import { useAgentChat } from "../hooks/use-agent-chat"
import { useConversationHistory } from "../hooks/use-conversation-history"
import { takePendingFirstMessage } from "../pending-first-message"
import { hasPendingApproval } from "../ai-agent.types"
import { MessageList } from "./message-list"
import { Composer } from "./composer"

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
    const sentPending = useRef(false)

    useEffect(() => {
        if (sentPending.current) return
        sentPending.current = true
        const text = takePendingFirstMessage(conversationId)
        if (text) void chat.sendMessage({ text })
    }, [chat, conversationId])
    const seen = useMemo(() => new Set(chat.messages.map((message) => message.id)), [chat.messages])
    const messages = useMemo(
        () => [...history.olderMessages.filter((message) => !seen.has(message.id)), ...chat.messages],
        [history.olderMessages, chat.messages, seen],
    )
    const busy = chat.status === "submitted" || chat.status === "streaming"
    const pending = hasPendingApproval(chat.messages[chat.messages.length - 1])

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col">
            <MessageList
                messages={messages}
                isStreaming={busy}
                hasOlder={history.hasOlder}
                isLoadingOlder={history.isLoadingOlder}
                onLoadOlder={history.loadOlder}
                onApprovalResponse={chat.addToolApprovalResponse}
                error={chat.error}
            />
            <Composer
                disabled={pending}
                busy={busy}
                hint={pending ? t("pendingApprovalHint") : undefined}
                onSend={(text) => void chat.sendMessage({ text })}
                onStop={() => void chat.stop()}
            />
        </div>
    )
}

export function ChatView({ conversationId }: { conversationId: string }) {
    const t = useTranslations("business.aiAgent")
    const history = useConversationHistory(conversationId)
    if (history.isError) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                <p className="text-sm text-muted-foreground">{t("loadFailed")}</p>
                <Button size="sm" variant="outline" onClick={() => void history.refetch()}>
                    <RefreshCwIcon className="size-4" />
                    {t("retry")}
                </Button>
            </div>
        )
    }
    if (!history.initialMessages) return <div className="flex-1" />
    return (
        <ChatSession key={conversationId} conversationId={conversationId} initialMessages={history.initialMessages} history={history} />
    )
}
