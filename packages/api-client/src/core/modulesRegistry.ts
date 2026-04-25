import { ApiRegistry } from './apiRegistry'
import { ApiClient } from './apiClient'
import {

} from '../modules'
import { toCamelCase } from '../utils/toCamelCase'

export type ModulesRegistryType = {

}

export type ApiKey = keyof ModulesRegistryType;

export const createApiRegistry = (apiClient: ApiClient) => {
    const registry = new ApiRegistry(apiClient);

    const modules = {

    } as const;

    Object.entries(modules).forEach(([key, api]) => {
        const camelKey = toCamelCase(key) as keyof ModulesRegistryType;
        // registry.register(api, camelKey);
    });

    return registry as unknown as ApiRegistry<ModulesRegistryType>;
}
