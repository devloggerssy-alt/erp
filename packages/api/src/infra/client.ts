import type {
    ApiPath,
    ApiPathByMethod,
    ApiPathParams,
    ApiQueryParams,
    ApiRequestBody,
    ApiResponse,
} from "./types"
import createClient from "openapi-fetch"
import type { paths } from "../../types/index"

type HttpMethod = "get" | "post" | "put" | "delete" | "patch"

export type ApiClientOptions = {
    headers?: Record<string, string>
}

type ApiRequestOptions<Path extends ApiPath, Method extends HttpMethod> =
    Omit<RequestInit, "method" | "body"> & {
        params?: ApiPathParams<Path, Method> extends never ? never : ApiPathParams<Path, Method>
        query?: ApiQueryParams<Path, Method> extends never ? never : ApiQueryParams<Path, Method>
        body?: ApiRequestBody<Path, Method> extends never ? never : ApiRequestBody<Path, Method>
    }

type LaravelValidationErrors = Record<string, string[]>

type LaravelErrorPayload = {
    success?: boolean
    message?: string
    data?: unknown
    errors?: LaravelValidationErrors | string[] | Record<string, unknown> | null
    pagination?: Record<string, unknown> | null
}

export class ApiError extends Error {
    public readonly name = "ApiError"

    constructor(
        public readonly status: number,
        public readonly statusText: string,
        public readonly endpoint: string,
        public readonly method: string,
        public readonly payload?: LaravelErrorPayload,
    ) {
        super(payload?.message ?? `${method.toUpperCase()} ${endpoint} failed with ${status} ${statusText}`.trim())
    }

    get validationErrors(): LaravelValidationErrors | undefined {
        return this.payload?.errors && !Array.isArray(this.payload.errors)
            ? (this.payload.errors as LaravelValidationErrors)
            : undefined
    }
}

export class ApiClient {
    private client

    constructor(
        protected baseUrl: string = process.env.NEXT_PUBLIC_API_URL ?? "",
        protected defaultOptions: ApiClientOptions = {},
    ) {
        this.client = createClient<paths>({
            baseUrl: `${this.normalizeBaseUrl(baseUrl)}/`,
        })
    }

    async request<Path extends ApiPath, Method extends HttpMethod>(
        endpoint: Path,
        method: Method,
        options: ApiRequestOptions<Path, Method> = {} as ApiRequestOptions<Path, Method>,
    ): Promise<ApiResponse<Path, Method>> {
        const ep = endpoint as never
        const opts = options as never
        const body = (options as Record<string, unknown>).body as never

        switch (method) {
            case "get":
                return this.get(ep, opts) as Promise<ApiResponse<Path, Method>>
            case "post":
                return this.post(ep, body, opts) as Promise<ApiResponse<Path, Method>>
            case "put":
                return this.put(ep, body, opts) as Promise<ApiResponse<Path, Method>>
            case "delete":
                return this.delete(ep, opts) as Promise<ApiResponse<Path, Method>>
            case "patch":
                return this.patch(ep, body, opts) as Promise<ApiResponse<Path, Method>>
            default:
                throw new ApiError(0, "Unsupported Method", endpoint, method, {
                    message: `Unsupported method: ${String(method)}`,
                })
        }
    }

    async get<Path extends ApiPathByMethod<"get">>(
        endpoint: Path,
        options: ApiRequestOptions<Path, "get"> = {} as ApiRequestOptions<Path, "get">,
    ): Promise<ApiResponse<Path, "get">> {
        const requestOptions = this.toFetchOptions(options)

        try {
            const { data, error, response } = await this.client.GET(endpoint, requestOptions as never)
            return this.resolveResult(endpoint, "get", data, error, response)
        } catch (err) {
            if (err instanceof ApiError) throw err
            throw this.createNetworkError(endpoint, "get")
        }
    }

    async post<Path extends ApiPathByMethod<"post">>(
        endpoint: Path,
        body: ApiRequestBody<Path, "post"> extends never ? undefined : ApiRequestBody<Path, "post">,
        options: Omit<ApiRequestOptions<Path, "post">, "body"> = {} as Omit<ApiRequestOptions<Path, "post">, "body">,
    ): Promise<ApiResponse<Path, "post">> {
        const requestOptions = this.toFetchOptions({ ...options, body })

        try {
            const { data, error, response } = await this.client.POST(endpoint, requestOptions as never)
            return this.resolveResult(endpoint, "post", data, error, response)
        } catch (err) {
            if (err instanceof ApiError) throw err
            throw this.createNetworkError(endpoint, "post")
        }
    }

    async put<Path extends ApiPathByMethod<"put">>(
        endpoint: Path,
        body: ApiRequestBody<Path, "put"> extends never ? undefined : ApiRequestBody<Path, "put">,
        options: Omit<ApiRequestOptions<Path, "put">, "body"> = {} as Omit<ApiRequestOptions<Path, "put">, "body">,
    ): Promise<ApiResponse<Path, "put">> {
        const requestOptions = this.toFetchOptions({ ...options, body })

        try {
            const { data, error, response } = await this.client.PUT(endpoint, requestOptions as never)
            return this.resolveResult(endpoint, "put", data, error, response)
        } catch (err) {
            if (err instanceof ApiError) throw err
            throw this.createNetworkError(endpoint, "put")
        }
    }

    async delete<Path extends ApiPathByMethod<"delete">>(
        endpoint: Path,
        options: ApiRequestOptions<Path, "delete"> = {} as ApiRequestOptions<Path, "delete">,
    ): Promise<ApiResponse<Path, "delete">> {
        const requestOptions = this.toFetchOptions(options)

        try {
            const { data, error, response } = await this.client.DELETE(endpoint, requestOptions as never)
            return this.resolveResult(endpoint, "delete", data, error, response)
        } catch (err) {
            if (err instanceof ApiError) throw err
            throw this.createNetworkError(endpoint, "delete")
        }
    }

    async patch<Path extends ApiPathByMethod<"patch">>(
        endpoint: Path,
        body: ApiRequestBody<Path, "patch"> extends never ? undefined : ApiRequestBody<Path, "patch">,
        options: Omit<ApiRequestOptions<Path, "patch">, "body"> = {} as Omit<ApiRequestOptions<Path, "patch">, "body">,
    ): Promise<ApiResponse<Path, "patch">> {
        const requestOptions = this.toFetchOptions({ ...options, body })

        try {
            const { data, error, response } = await this.client.PATCH(endpoint, requestOptions as never)
            return this.resolveResult(endpoint, "patch", data, error, response)
        } catch (err) {
            if (err instanceof ApiError) throw err
            throw this.createNetworkError(endpoint, "patch")
        }
    }

    protected normalizeBaseUrl(baseUrl: string): string {
        return baseUrl.replace(/\/+$/, "")
    }

    protected async postFormData(endpoint: string, formData: FormData): Promise<any> {
        const url = `${this.normalizeBaseUrl(this.baseUrl)}${endpoint}`
        const headers = new Headers(this.defaultOptions.headers as Record<string, string>)
        headers.set("Accept", "application/json")
        // Content-Type is intentionally omitted — fetch sets multipart/form-data + boundary automatically

        const response = await fetch(url, { method: "POST", headers, body: formData })
        const text = await response.text()
        const data = text ? JSON.parse(text) : null

        if (!response.ok) {
            throw new ApiError(response.status, response.statusText, endpoint, "post", data)
        }

        return data
    }

    private toFetchOptions<Path extends ApiPath, Method extends HttpMethod>(
        options: ApiRequestOptions<Path, Method>,
    ): Record<string, unknown> {
        const { params, query, body, headers, ...requestInit } = options as Record<string, unknown>
        const requestOptions: Record<string, unknown> = {
            ...requestInit,
            headers: this.withDefaultHeaders(headers as HeadersInit | undefined),
        }

        if (params || query) {
            requestOptions.params = {
                ...(params ? { path: params } : {}),
                ...(query ? { query } : {}),
            }
        }

        if (body !== undefined) {
            requestOptions.body = body
        }

        return requestOptions
    }

    private withDefaultHeaders(headers?: HeadersInit): Headers {
        const finalHeaders = new Headers(this.defaultOptions.headers)
        finalHeaders.set("Accept", "application/json")
        if (headers) {
            new Headers(headers).forEach((value, key) => finalHeaders.set(key, value))
        }
        return finalHeaders
    }

    private resolveResult<Path extends ApiPath, Method extends HttpMethod>(
        endpoint: Path,
        method: Method,
        data: unknown,
        error: unknown,
        response: Response,
    ): ApiResponse<Path, Method> {
        if (error !== undefined) {
            throw new ApiError(
                response.status,
                response.statusText,
                endpoint,
                method,
                this.normalizeErrorPayload(error),
            )
        }

        return data as ApiResponse<Path, Method>
    }

    private normalizeErrorPayload(error: unknown): LaravelErrorPayload | undefined {
        if (!error || typeof error !== "object") {
            return undefined
        }

        if ("message" in error || "errors" in error) {
            return error as LaravelErrorPayload
        }

        return {
            message: "Request failed",
            data: error,
        }
    }

    private createNetworkError(endpoint: string, method: string): ApiError {
        return new ApiError(
            0,
            "Network Error",
            endpoint,
            method,
            { message: "Network error occurred. Please check your connection and try again." },
        )
    }
}
