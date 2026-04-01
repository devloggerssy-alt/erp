// Base types for any http client : FetchHttpClient, AxiosHttpClient, etc.
export type HttpClientBaseConfig = {
    baseUrl: string;
    log?: boolean;
}