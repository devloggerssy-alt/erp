import { ApiQueryOptions, ApiResponse } from "@devloggers/contracts";
import { ApiClient } from "./apiClient";
import { serializeQueryOptions } from "../utils/querySerializer";
import { HttpClientOptions } from "./fetchHttpClient";

export type ApiAction = <RT>(url: string, options?: Partial<HttpClientOptions>) => Promise<RT>;

export class ApiService<ListResponse = any[], ItemResponse = any, CreateDto = any, UpdateDto = any> {
    constructor(protected readonly apiClient: ApiClient, public moduleName: string = '') {

    }

    get = <RT>(url: string, options?: Partial<HttpClientOptions> & { query?: ApiQueryOptions }) => {
        return this.apiClient.fetch<RT>(url, options);
    }

    post = <RT>(url: string, options?: Partial<HttpClientOptions>) => {
        return this.apiClient.fetch<RT>(url, {
            method: "POST",
            ...options
        });
    }

    put = <RT>(url: string, options?: Partial<HttpClientOptions>) => {
        return this.apiClient.fetch<RT>(url, {
            method: "PUT",
            ...options
        });
    }

    delete = <RT>(url: string, options?: Partial<HttpClientOptions>) => {
        return this.apiClient.fetch<RT>(url, {
            method: "DELETE",
            ...options
        });
    }

    patch = <RT>(url: string, options?: Partial<HttpClientOptions>) => {
        return this.apiClient.fetch<RT>(url, {
            method: "PATCH",
            ...options
        });
    }

    getList = <RT = ListResponse>(query?: ApiQueryOptions, options?: Partial<HttpClientOptions>, url?: string) => {
        const baseUrl = url || `${this.moduleName}`;
        console.log("GET_LIST", baseUrl)
        const queryString = query ? serializeQueryOptions(query) : '';
        const finalUrl = queryString ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${queryString}` : baseUrl;

        return this.apiClient.fetch<RT>(finalUrl, {
            method: "GET",
            ...options
        }) as Promise<ApiResponse<RT>>;
    }

    getOne = <RT = ItemResponse>(id: string, options?: Partial<HttpClientOptions>, url?: string) => {
        return this.apiClient.fetch<RT>(url || `${this.moduleName}/${id}`, {
            method: "GET",
            ...options
        });
    }

    create = <RT,>(options?: Partial<HttpClientOptions>, url?: string) => {
        return this.apiClient.fetch<RT>(url || `${this.moduleName}`, {
            method: "POST",
            body: JSON.stringify(options?.body),
            ...options
        });
    }

    deleteOne = <RT>(id: string, options?: Partial<HttpClientOptions>, url?: string) => {
        return this.apiClient.fetch<RT>(url || `${this.moduleName}/${id}`, {
            method: "DELETE",
            ...options
        });
    }

    deleteMany = <RT>(ids: string[], options?: Partial<HttpClientOptions>, url?: string) => {
        return this.apiClient.fetch<RT>(url || `${this.moduleName}`, {
            method: "DELETE",
            ...options
        });
    }

    update = <RT>(id: string, data: any, options?: Partial<HttpClientOptions>, url?: string) => {
        return this.apiClient.fetch<RT>(url || `${this.moduleName}/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
            ...options
        });
    }


    updateMany = <RT>(data: any, options?: Partial<HttpClientOptions>, url?: string) => {
        return this.apiClient.fetch<RT>(url || `${this.moduleName}/update`, {
            method: "PUT",
            body: JSON.stringify(data),
            ...options
        });
    }

}

