import { HttpClientOptions } from "../core/fetchHttpClient";

export const jsonRequest = (dto: unknown): Partial<HttpClientOptions> => ({
    body: JSON.stringify(dto),
    headers: { 'Content-Type': 'application/json' }
})