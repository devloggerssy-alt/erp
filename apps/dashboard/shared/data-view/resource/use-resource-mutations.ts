"use client"

import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import type { CrudCollectionClient } from "@devloggers/api-client"

export type UseResourceMutationsConfig = {
    invalidateQuery: () => void
}

export type UseResourceMutationsResult = {
    deleteItem: (id: string) => Promise<unknown>
}

export function useResourceMutations<TClient extends CrudCollectionClient>(
    client: TClient,
    config: UseResourceMutationsConfig,
): UseResourceMutationsResult {
    const { mutateAsync: deleteItem } = useMutation({
        mutationFn: (id: string) => {
            const promise = client.destroy(id)
            toast.promise(promise, {
                loading: "Deleting...",
                success: "Deleted successfully",
                error: "Failed to delete",
            })
            return promise
        },
        onSuccess: () => config.invalidateQuery(),
    })

    return { deleteItem }
}