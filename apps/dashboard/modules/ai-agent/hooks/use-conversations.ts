"use client"

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useApi } from "@/shared/useApi"

// `list` and `messages` must not share a prefix: invalidating the conversation list
// (e.g. after a chat turn renames it) must not also invalidate every loaded message page.
export const conversationKeys = {
    list: ["ai", "conversations", "list"] as const,
    messages: (id: string) => ["ai", "conversations", "messages", id] as const,
}

export function useConversations() {
    const api = useApi()
    return useInfiniteQuery({
        queryKey: conversationKeys.list,
        initialPageParam: undefined as string | undefined,
        queryFn: ({ pageParam }) => api.ai.listConversations({ cursor: pageParam, limit: 20 }),
        getNextPageParam: (last) => last.data?.nextCursor ?? undefined,
    })
}

export function useConversationMutations() {
    const api = useApi()
    const queryClient = useQueryClient()
    const invalidate = () => queryClient.invalidateQueries({ queryKey: conversationKeys.list })
    return {
        create: useMutation({ mutationFn: () => api.ai.createConversation({}), onSuccess: invalidate }),
        rename: useMutation({
            mutationFn: (input: { id: string; title: string }) => api.ai.renameConversation(input.id, { title: input.title }),
            onSuccess: invalidate,
        }),
        remove: useMutation({ mutationFn: (id: string) => api.ai.deleteConversation(id), onSuccess: invalidate }),
    }
}
