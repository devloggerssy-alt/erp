"use client"

import type { UIMessage } from "ai"
import { useMemo } from "react"
import { useAgentChat } from "../hooks/use-agent-chat"
import { useConversationHistory } from "../hooks/use-conversation-history"
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
    const chat = useAgentChat({ conversationId, initialMessages })
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
                onSend={(text) => void chat.sendMessage({ text })}
                onStop={() => void chat.stop()}
            />
        </div>
    )
}

export function ChatView({ conversationId }: { conversationId: string }) {
    const history = useConversationHistory(conversationId)
    if (!history.initialMessages) return <div className="flex-1" />
    return (
        <ChatSession key={conversationId} conversationId={conversationId} initialMessages={history.initialMessages} history={history} />
    )
}
