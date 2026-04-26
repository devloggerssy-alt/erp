import { ApiClient } from "./apiClient";
import { ApiService } from "./apiService";

export class ApiRegistry<T extends Record<string, ApiService> = any> {
    private map = new Map<keyof T, ApiService>();
    constructor(private apiClient: ApiClient) {
    }
    register<K extends string, A extends ApiService>(api: A, moduleName: K): ApiRegistry<T & Record<K, A>> {
        this.map.set(moduleName as keyof T, api);
        return this as unknown as ApiRegistry<T & Record<K, A>>;
    }
    get<K extends keyof T>(moduleName: K): T[K] {
        return this.map.get(moduleName) as T[K];
    }
    getAll(): T {
        const entries = Object.fromEntries(this.map.entries()) as T;
        return entries

    }
}
