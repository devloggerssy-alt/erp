"use client";

import { ApiClientResult } from "../core/apiClient";
import { ApiService } from "../core/apiService";
import { MutationOptions, useMutation, useQueryClient } from "@tanstack/react-query";

export const useApiCreate = <TPayload, TResponse>(api: ApiService, options: Partial<MutationOptions<TResponse, Error, TPayload>> = {}) => {
    const client = useQueryClient()
    const mutation = useMutation({
        mutationFn: async (data: TPayload) => {
            return await api.create<TResponse>({ body: JSON.stringify(data) })
        },
        onSuccess: (data, ...rest) => {
            client.invalidateQueries({ queryKey: [api.moduleName] })
            options.onSuccess?.(data as TResponse, ...rest)
        },
        onError: (error) => {
            console.log(error)
        }
    })

    return mutation;
}

export const useApiUpdate = <TPayload, TResponse>(api: ApiService, { mutationFn, ...otherOptions }: Partial<MutationOptions<ApiClientResult<TResponse>, Error, { data: TPayload, id: string }>>) => {
    const client = useQueryClient()
    const mutation = useMutation({
        ...otherOptions,
        mutationFn: async (payload: { data: TPayload, id: string }) => {
            return await api.update<TResponse>(payload.id, payload.data)
        },
        onSuccess: (data) => {
            client.invalidateQueries({ queryKey: [api.moduleName] })
        },
        onError: (error) => {
            console.log(error)
        },
    })
    return mutation;
}

export const useApiDelete = <TResponse>(api: ApiService, mutationConfig?: Partial<MutationOptions<ApiClientResult<TResponse>, Error, any>>) => {
    const client = useQueryClient()
    const mutation = useMutation({
        mutationFn: async (payload: { id: string }) => {
            return await api.deleteOne<TResponse>(payload.id)
        },
        onSuccess: (data, ...rest) => {
            client.invalidateQueries({ queryKey: [api.moduleName] })
            mutationConfig?.onSuccess?.(data, ...rest)
        },
        onError: (error, ...rest) => {
            console.log(error)
            mutationConfig?.onError?.(error, ...rest)
        }
    })
    return mutation;
}

