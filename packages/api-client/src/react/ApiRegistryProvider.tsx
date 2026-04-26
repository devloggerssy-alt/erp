"use client";

import { createContext, useContext, useMemo } from "react";
import { ApiRegistry } from "../core/apiRegistry";
import { ModulesRegistryType, createApiRegistry } from "../core/modulesRegistry";
import { ApiClient } from "../core/apiClient";

export const ApiRegistryContext = createContext<{ registry: ApiRegistry<ModulesRegistryType> } & ReturnType<ApiRegistry<ModulesRegistryType>['getAll']> | null>(null);

export const ApiRegistryProvider = ({ children, apiClient }: { children: React.ReactNode, apiClient: ApiClient }) => {
    const registry = createApiRegistry(apiClient);
    const value = {
        registry: registry as unknown as ApiRegistry<ModulesRegistryType> & ReturnType<ApiRegistry<ModulesRegistryType>['getAll']>,
        ...registry.getAll(),

    }
    return <ApiRegistryContext.Provider value={value}>{children}</ApiRegistryContext.Provider>
}

export const useApiRegistry = () => {
    const registry = useContext(ApiRegistryContext);
    if (!registry) {
        throw new Error('ApiRegistry not found');
    }
    return registry;
}


