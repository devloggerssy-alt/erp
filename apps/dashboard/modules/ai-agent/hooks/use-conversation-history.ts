"use client"

import { useInfiniteQuery } from "@tanstack/react-query"
import { aiResource, type ApiResponse } from "@devloggers/api-contracts"
import { safeValidateUIMessages, type UIMessage } from "ai"
import { useMemo } from "react"
import { useApi } from "@/shared/useApi"
import { conversationKeys } from "./use-conversations"

type MessagePage = NonNullable<ApiResponse<typeof aiResource.routes.messages, "get">["data"]>
type StoredMessage = MessagePage["items"][number]

const ROLE: Record<StoredMessage["role"], UIMessage["role"]> = { USER: "user", ASSISTANT: "assistant", SYSTEM: "system" }

/**
 * Parts were produced by the AI SDK and stored verbatim by the API (SDK-owned JSON, not an API
 * DTO shape) — validated per-message with the SDK's own `safeValidateUIMessages` rather than cast,
 * so a malformed stored row is dropped instead of reaching `useChat` as an unchecked `UIMessage`.
 */
async function toUiMessages(messages: StoredMessage[]): Promise<UIMessage[]> {
    const results = await Promise.all(
        messages.map(async (message) => {
            const result = await safeValidateUIMessages<UIMessage>({
                messages: [{ id: message.id, role: ROLE[message.role], parts: message.parts }],
            })
            if (!result.success) {
                console.warn(`Dropping invalid stored AI message ${message.id}`, result.error)
                return null
            }
            return result.data[0] ?? null
        }),
    )
    return results.filter((message): message is UIMessage => message !== null)
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
        queryFn: async ({ pageParam }) => {
            const response = await api.ai.listMessages(conversationId, { cursor: pageParam, limit: 30 })
            const items = await toUiMessages(response.data?.items ?? [])
            return { items, nextCursor: response.data?.nextCursor ?? null }
        },
        getNextPageParam: (last) => last.nextCursor ?? undefined,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
    })

    const pages = query.data?.pages
    const hasFirstPage = !!pages?.length
    const initialMessages = useMemo(
        () => (pages?.[0] ? [...pages[0].items].reverse() : undefined),
        // Only the first page seeds useChat; later pages must not reset it.
        // `conversationId` is included so seeding can't leak across conversations if this
        // component ever stays mounted across a conversation switch.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [hasFirstPage, conversationId],
    )
    const olderMessages = useMemo(() => (pages ?? []).slice(1).flatMap((page) => page.items).reverse(), [pages])

    return {
        initialMessages,
        olderMessages,
        loadOlder: () => void query.fetchNextPage(),
        hasOlder: query.hasNextPage,
        isLoadingOlder: query.isFetchingNextPage,
        isError: query.isError,
        refetch: query.refetch,
    }
}
