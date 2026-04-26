import { HttpClientBaseConfig } from "./types";

// --- New Type Definition ---
// Define a wrapper to keep headers and status alongside the data
export interface FetchHttpClientResponse<T> extends Pick<Awaited<Promise<Response>>, 'status' | 'headers' | 'statusText' | 'ok'> {
    data: T;

}

// Custom Error Class
export class HttpError extends Error {
    constructor(
        message: string,
        public status: number,
        public body: any,
        public headers?: Headers
    ) {
        super(message);
        this.name = 'HttpError';
        Object.setPrototypeOf(this, HttpError.prototype);
    }
}

// Interceptor Types
export type RequestInterceptor = (
    config: RequestInit,
    url: string
) => RequestInit | Promise<RequestInit>;

export type ResponseInterceptor = (
    response: Response
) => Response | Promise<Response>;

export type ErrorInterceptor = (
    error: HttpError
) => HttpError | Promise<HttpError>;

// Configuration Types
export type FetchHttpClientConfig = HttpClientBaseConfig & RequestInit & {
    timeout?: number;
    requestInterceptors?: RequestInterceptor[];
    responseInterceptors?: ResponseInterceptor[];
    errorInterceptors?: ErrorInterceptor[];
};

// --- Updated Interface ---
// Methods now return Promise<FetchHttpClientResponse<T>> instead of Promise<T>
export interface IHttpClient {
    fetch<T = any>(url: string, options?: Partial<FetchHttpClientConfig>): Promise<FetchHttpClientResponse<T>>;
    get<T = any>(url: string, options?: Omit<Partial<FetchHttpClientConfig>, 'method' | 'body'>): Promise<FetchHttpClientResponse<T>>;
    post<T = any>(url: string, body?: any, options?: Omit<Partial<FetchHttpClientConfig>, 'method' | 'body'>): Promise<FetchHttpClientResponse<T>>;
    put<T = any>(url: string, body?: any, options?: Omit<Partial<FetchHttpClientConfig>, 'method' | 'body'>): Promise<FetchHttpClientResponse<T>>;
    patch<T = any>(url: string, body?: any, options?: Omit<Partial<FetchHttpClientConfig>, 'method' | 'body'>): Promise<FetchHttpClientResponse<T>>;
    delete<T = any>(url: string, options?: Omit<Partial<FetchHttpClientConfig>, 'method' | 'body'>): Promise<FetchHttpClientResponse<T>>;
}

// Default Options
const DEFAULT_FETCH_OPTIONS: RequestInit = {
    credentials: "include",
    headers: {
        "Content-Type": "application/json",
    }
};

// Main HTTP Client Class
export class FetchHttpClient implements IHttpClient {
    private requestInterceptors: RequestInterceptor[] = [];
    private responseInterceptors: ResponseInterceptor[] = [];
    private errorInterceptors: ErrorInterceptor[] = [];

    constructor(private readonly config: Partial<FetchHttpClientConfig> = {}) {
        this.requestInterceptors = config.requestInterceptors || [];
        this.responseInterceptors = config.responseInterceptors || [];
        this.errorInterceptors = config.errorInterceptors || [];
    }

    static create(config?: Partial<FetchHttpClientConfig>): FetchHttpClient {
        return new FetchHttpClient(config);
    }

    addRequestInterceptor(interceptor: RequestInterceptor): void {
        this.requestInterceptors.push(interceptor);
    }

    addResponseInterceptor(interceptor: ResponseInterceptor): void {
        this.responseInterceptors.push(interceptor);
    }

    addErrorInterceptor(interceptor: ErrorInterceptor): void {
        this.errorInterceptors.push(interceptor);
    }

    // --- Updated Fetch Method ---
    async fetch<T = any>(url: string, options: Partial<FetchHttpClientConfig> = {}): Promise<FetchHttpClientResponse<T>> {
        const mergedOptions = {
            ...this.config,
            ...options,
        };

        const { baseUrl = '', timeout, requestInterceptors, responseInterceptors, errorInterceptors, ...fetchConfig } = mergedOptions;
        const fullUrl = this.buildUrl(baseUrl, url);

        const mergedHeaders = this.mergeHeaders(
            DEFAULT_FETCH_OPTIONS.headers as Record<string, string>,
            this.config?.headers,
            options?.headers
        );

        let fetchOptions: RequestInit = {
            ...DEFAULT_FETCH_OPTIONS,
            ...fetchConfig,
            headers: mergedHeaders,
        };

        fetchOptions.body = this.prepareBody(fetchOptions.body, mergedHeaders);
        fetchOptions = await this.applyRequestInterceptors(fetchOptions, fullUrl);

        const { signal: configuredSignal, cleanup } = this.setupTimeout(timeout, fetchOptions.signal as AbortSignal);
        if (configuredSignal) {
            fetchOptions.signal = configuredSignal;
        }

        try {
            // executeRequest generic type updated to match new return signature
            const result = await this.executeRequest<FetchHttpClientResponse<T>>(fullUrl, fetchOptions);
            return result;
        } finally {
            cleanup?.();
        }
    }

    private setupTimeout(timeout?: number, existingSignal?: AbortSignal): {
        signal?: AbortSignal;
        cleanup?: () => void;
    } {
        if (!timeout) {
            return { signal: existingSignal };
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        const abortHandler = () => controller.abort();
        existingSignal?.addEventListener('abort', abortHandler);

        const cleanup = () => {
            clearTimeout(timeoutId);
            existingSignal?.removeEventListener('abort', abortHandler);
        };

        return { signal: controller.signal, cleanup };
    }

    private async applyRequestInterceptors(config: RequestInit, url: string): Promise<RequestInit> {
        let modifiedConfig = config;
        for (const interceptor of this.requestInterceptors) {
            modifiedConfig = await interceptor(modifiedConfig, url);
        }
        return modifiedConfig;
    }

    private async applyResponseInterceptors(response: Response): Promise<Response> {
        let modifiedResponse = response;
        for (const interceptor of this.responseInterceptors) {
            modifiedResponse = await interceptor(modifiedResponse);
        }
        return modifiedResponse;
    }

    private async applyErrorInterceptors(error: HttpError): Promise<HttpError> {
        let modifiedError = error;
        for (const interceptor of this.errorInterceptors) {
            modifiedError = await interceptor(modifiedError);
        }
        return modifiedError;
    }

    private buildUrl(baseUrl: string, url: string): string {
        if (!baseUrl) return url;
        try {
            return new URL(url, baseUrl).toString();
        } catch {
            const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
            const path = url.startsWith('/') ? url : `/${url}`;
            return `${base}${path}`;
        }
    }

    private mergeHeaders(...headersList: any[]): Record<string, string> {
        const merged: Record<string, string> = {};
        for (const headers of headersList) {
            if (!headers) continue;
            if (headers instanceof Headers) {
                headers.forEach((value, key) => {
                    merged[key] = value;
                });
            } else if (typeof headers === 'object') {
                Object.entries(headers).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                        merged[key] = String(value);
                    }
                });
            }
        }
        return merged;
    }

    private prepareBody(body: any, headers: Record<string, string>): BodyInit | undefined {
        if (!body) return undefined;
        if (body instanceof FormData) {
            delete headers['Content-Type'];
            delete headers['content-type'];
            return body;
        }
        if (body instanceof URLSearchParams) {
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
            return body;
        }
        if (
            body instanceof Blob ||
            body instanceof ArrayBuffer ||
            typeof body === 'string'
        ) {
            return body;
        }
        if (typeof body === 'object') {
            headers['Content-Type'] = 'application/json';
            return JSON.stringify(body);
        }
        return body;
    }

    private async executeRequest<T>(url: string, options: RequestInit): Promise<T> {
        try {
            const response = await fetch(url, options);
            const interceptedResponse = await this.applyResponseInterceptors(response);
            return await this.handleResponse<T>(interceptedResponse);
        } catch (error: any) {
            let httpError: HttpError;
            if (error.name === 'AbortError') {
                httpError = new HttpError('Request timeout', 408, null);
            } else if (error instanceof TypeError) {
                httpError = new HttpError('Network error', 0, null);
            } else if (error instanceof HttpError) {
                httpError = error;
            } else {
                httpError = new HttpError(error.message || 'Unknown error', 0, null);
            }
            const interceptedError = await this.applyErrorInterceptors(httpError);
            throw interceptedError;
        }
    }

    // --- Critical Fix Here ---
    // Now returns the wrapper object containing data, status, and headers
    private async handleResponse<T>(response: Response): Promise<any> {
        const contentType = response.headers.get("content-type") || "";
        let responseBody: any;

        try {
            if (contentType.includes("application/json")) {
                responseBody = await response.json();
            } else if (contentType.includes("text/")) {
                responseBody = await response.text();
            } else if (response.status !== 204) {
                responseBody = await response.arrayBuffer();
            }
        } catch (parseError) {
            try {
                responseBody = await response.text();
            } catch {
                responseBody = null;
            }
        }

        if (!response.ok) {
            throw new HttpError(
                responseBody?.message ||
                responseBody?.error ||
                `Request failed with status ${response.status}`,
                response.status,
                responseBody,
                response.headers
            );
        }

        // Instead of returning just responseBody, we return the structured object
        return {
            data: responseBody as T,
            status: response.status,
            headers: response.headers
        };
    }

    // --- Updated Convenience Methods ---
    async get<T = any>(url: string, options?: Omit<Partial<FetchHttpClientConfig>, 'method' | 'body'>): Promise<FetchHttpClientResponse<T>> {
        return this.fetch<T>(url, { ...options, method: 'GET' });
    }

    async post<T = any>(url: string, body?: any, options?: Omit<Partial<FetchHttpClientConfig>, 'method' | 'body'>): Promise<FetchHttpClientResponse<T>> {
        return this.fetch<T>(url, { ...options, method: 'POST', body });
    }

    async put<T = any>(url: string, body?: any, options?: Omit<Partial<FetchHttpClientConfig>, 'method' | 'body'>): Promise<FetchHttpClientResponse<T>> {
        return this.fetch<T>(url, { ...options, method: 'PUT', body });
    }

    async patch<T = any>(url: string, body?: any, options?: Omit<Partial<FetchHttpClientConfig>, 'method' | 'body'>): Promise<FetchHttpClientResponse<T>> {
        return this.fetch<T>(url, { ...options, method: 'PATCH', body });
    }

    async delete<T = any>(url: string, options?: Omit<Partial<FetchHttpClientConfig>, 'method' | 'body'>): Promise<FetchHttpClientResponse<T>> {
        return this.fetch<T>(url, { ...options, method: 'DELETE' });
    }
}