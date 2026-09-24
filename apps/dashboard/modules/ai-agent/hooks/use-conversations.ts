"use client"

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useApi } from "@/shared/useApi"

export const conversationKeys = {
    all: ["ai", "conversations"] as const,
    messages: (id: string) => ["ai", "conversations", id, "messages"] as const,
}

export function useConversations() {
    const api = useApi()
    return useInfiniteQuery({
        queryKey: conversationKeys.all,
        initialPageParam: undefined as string | undefined,
        queryFn: ({ pageParam }) => api.ai.listConversations({ cursor: pageParam, limit: 20 }),
        getNextPageParam: (last) => last.data?.nextCursor ?? undefined,
    })
}

export function useConversationMutations() {
    const api = useApi()
    const queryClient = useQueryClient()
    const invalidate = () => queryClient.invalidateQueries({ queryKey: conversationKeys.all })
    return {
        create: useMutation({ mutationFn: () => api.ai.createConversation({}), onSuccess: invalidate }),
        rename: useMutation({
            mutationFn: (input: { id: string; title: string }) => api.ai.renameConversation(input.id, { title: input.title }),
            onSuccess: invalidate,
        }),
        remove: useMutation({ mutationFn: (id: string) => api.ai.deleteConversation(id), onSuccess: invalidate }),
    }
}
