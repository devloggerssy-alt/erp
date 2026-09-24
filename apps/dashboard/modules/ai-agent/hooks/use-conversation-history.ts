"use client"

import { useInfiniteQuery } from "@tanstack/react-query"
import type { UIMessage } from "ai"
import { useMemo } from "react"
import { useApi } from "@/shared/useApi"
import { conversationKeys } from "./use-conversations"

type StoredMessage = { id: string; role: "USER" | "ASSISTANT" | "SYSTEM"; parts: Record<string, unknown>[] }

const ROLE: Record<StoredMessage["role"], UIMessage["role"]> = { USER: "user", ASSISTANT: "assistant", SYSTEM: "system" }

function toUiMessage(message: StoredMessage): UIMessage {
    // Parts were produced by the AI SDK and stored verbatim by the API (SDK-owned JSON, not an API DTO shape).
    return { id: message.id, role: ROLE[message.role], parts: message.parts as UIMessage["parts"] }
}

/**
 * Page 1 (newest) seeds useChat; later pages are older history prepended above it.
 * Pages arrive newest-first and are reversed to chronological order here.
 */
export function useConversationHistory(conversationId: string) {
    const api = useApi()
    const query = useInfiniteQuery({
        queryKey: conversationKeys.messages(conversationId),
        initialPageParam: undefined as string | undefined,
        queryFn: ({ pageParam }) => api.ai.listMessages(conversationId, { cursor: pageParam, limit: 30 }),
        getNextPageParam: (last) => last.data?.nextCursor ?? undefined,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
    })

    const pages = query.data?.pages
    const hasFirstPage = !!pages?.length
    const initialMessages = useMemo(
        () => (pages?.[0] ? (pages[0].data?.items ?? []).map(toUiMessage).reverse() : undefined),
        // Only the first page seeds useChat; later pages must not reset it.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [hasFirstPage],
    )
    const olderMessages = useMemo(
        () => (pages ?? []).slice(1).flatMap((page) => (page.data?.items ?? []).map(toUiMessage)).reverse(),
        [pages],
    )

    return {
        initialMessages,
        olderMessages,
        loadOlder: () => void query.fetchNextPage(),
        hasOlder: query.hasNextPage,
        isLoadingOlder: query.isFetchingNextPage,
    }
}
