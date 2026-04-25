import { FetchHttpClientConfig } from "../core/fetchHttpClient";

export const jsonRequest = (dto: unknown): Partial<FetchHttpClientConfig> => ({
    body: JSON.stringify(dto),
    headers: { 'Content-Type': 'application/json' }
})