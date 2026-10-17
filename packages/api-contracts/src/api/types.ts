import type { components, paths } from "../../types/index"

type HttpMethod = "get" | "put" | "post" | "delete" | "options" | "head" | "patch" | "trace"
type NotNeverOrUndefined<T> = [Exclude<T, undefined>] extends [never] ? never : Exclude<T, undefined>

type OperationFor<Path extends ApiPath, Method extends HttpMethod> = Method extends keyof paths[Path]
    ? NotNeverOrUndefined<paths[Path][Method]>
    : never

// ── Re-exports ──
export type ApiComponents = components

// ── Path & Method helpers ──
export type ApiPath = keyof paths

export type ApiPathByMethod<Method extends HttpMethod> = {
    [Path in ApiPath]: OperationFor<Path, Method> extends never ? never : Path
}[ApiPath]

// ── Parameter helpers ──
export type ApiPathParams<Path extends ApiPath, Method extends HttpMethod> =
    OperationFor<Path, Method> extends { parameters: { path: infer Params } }
    ? Params
    : never

/**
 * Query params of an operation. openapi-typescript emits `query?: {...}` when every
 * query param is optional and `query?: never` when there are none; both the required
 * and the optional form resolve to the params object, and "no params" stays `never`.
 */
export type ApiQueryParams<Path extends ApiPath, Method extends HttpMethod> =
    OperationFor<Path, Method> extends { parameters: infer Parameters }
    ? "query" extends keyof Parameters
        ? NotNeverOrUndefined<Parameters["query" & keyof Parameters]>
        : never
    : never

// ── Request / Response body helpers ──
export type ApiRequestBody<P extends ApiPath, M extends keyof paths[P]> =
    Operation<P, M> extends { requestBody: { content: { "application/json": infer J } } }
    ? J
    : Operation<P, M> extends { requestBody: { content: { "multipart/form-data": infer J } } }
    ? J
    : never;

type Operation<P extends ApiPath, M extends keyof paths[P]> = paths[P][M];
export type ApiResponse<P extends ApiPath, M extends keyof paths[P]> =
    Operation<P, M> extends { responses: infer R }
    ? {
        [K in keyof R]: K extends number
        ? (K extends 200 | 201 | 202 | 204 | 206 ? (R[K] extends { content: { "application/json": infer J } } ? J : never) : never)
        : K extends "default" ? (R[K] extends { content: { "application/json": infer J } } ? J : never) : never
    }[keyof R]
    : never;
