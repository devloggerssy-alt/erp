"use client"

import { useChat } from "@ai-sdk/react"
import { lastAssistantMessageIsCompleteWithApprovalResponses, type UIMessage } from "ai"
import { useMemo } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useApi } from "@/shared/useApi"
import { createNestChatTransport } from "../transport/nest-chat-transport"
import { conversationKeys } from "./use-conversations"

export function useAgentChat({ conversationId, initialMessages }: { conversationId: string; initialMessages: UIMessage[] }) {
    const api = useApi()
    const queryClient = useQueryClient()
    const transport = useMemo(() => createNestChatTransport(() => api.ai.chatTarget(conversationId)), [api, conversationId])

    return useChat<UIMessage>({
        id: conversationId,
        messages: initialMessages,
        transport,
        sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
        // Invalidate the conversation list only (e.g. title/updatedAt refresh) — must not also
        // refetch every loaded history page for this conversation after each turn.
        onFinish: () => void queryClient.invalidateQueries({ queryKey: conversationKeys.list }),
    })
}
