"use client"

import { useQuery } from "@tanstack/react-query"
import type { CustomFieldModule, CustomFieldResponseDto } from "@devloggers/api-contracts"
import { customFieldResource } from "@devloggers/api-contracts"
import { useApi } from "@/shared/useApi"

export function useCustomFieldDefinitions(module: CustomFieldModule) {
    const api = useApi()

    const query = useQuery({
        queryKey: [customFieldResource.key, "by-module", module],
        queryFn: () => api[customFieldResource.key].listByModule(module),
        staleTime: 5 * 60 * 1000,
    })

    const definitions = (query.data?.data ?? []) as CustomFieldResponseDto[]

    return {
        definitions,
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    }
}
