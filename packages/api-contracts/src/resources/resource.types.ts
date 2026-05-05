import type { paths } from "../../types"

/** All OpenAPI path keys */
type ApiPath = keyof paths

/**
 * Converts an OpenAPI-style path segment `{param}` to Express/NestJS `:param`.
 * Recursively handles multiple params in a single path.
 *
 * @example
 * PathToExpress<"/users/{id}/status"> → "/users/:id/status"
 * PathToExpress<"/payments/{id}/allocations/{allocationId}"> → "/payments/:id/allocations/:allocationId"
 */
type PathToExpress<T extends string> =
  T extends `${infer Pre}{${infer Param}}${infer Post}`
    ? `${Pre}:${Param}${PathToExpress<Post>}`
    : T

/** Union of all valid route values in Express `:param` style, derived from generated OpenAPI types */
export type ResourceRoute = PathToExpress<ApiPath>

/**
 * Defines the shape of a resource definition object.
 * Constrains `routes` values to be valid Express-style paths derived from the OpenAPI spec.
 */
export interface ResourceDefinition<
  TKey extends string = string,
  TRoutes extends Record<string, ResourceRoute> = Record<string, ResourceRoute>,
  TPaths extends Record<string, string> = Record<string, string>,
> {
  /** Unique resource key used as React Query cache key */
  key: TKey
  /** Full URL paths with leading slash — used by api-client fetch calls */
  routes: TRoutes
  /** Path segments without leading slash — used by NestJS @Controller / @Get */
  paths: TPaths
}

/**
 * Type-safe helper to define a resource.
 * Validates that all `routes` values are real paths from the OpenAPI-generated spec.
 *
 * @example
 * export const userResource = defineResource({
 *   key: 'users',
 *   routes: { list: '/users', details: '/users/:id' },
 *   paths: { root: 'users', byId: ':id' },
 * })
 */
export function defineResource<
  TKey extends string,
  TRoutes extends Record<string, ResourceRoute>,
  TPaths extends Record<string, string>,
>(resource: ResourceDefinition<TKey, TRoutes, TPaths>): ResourceDefinition<TKey, TRoutes, TPaths> {
  return resource
}
