// ── Legacy (backward-compatible) ──
export { Resource } from "./resource"
export { ResourcePage } from "./resource-page"
export { ResourceTableView } from "./resource-table-view"
export { useResource } from "./use-resource"

// ── Compound Component System ──
export { ResourceProvider, useResourceContext } from "./resource-context"
export { ResourceLayout } from "./resource-layout"
export { ResourceTable } from "./resource-table"
export { ResourceGrid } from "./resource-grid"
export { ResourcePagination } from "./resource-pagination"
export { useResourceQuery } from "./use-resource-query"
export { useResourceMutations } from "./use-resource-mutations"

// ── Legacy Types ──
export type { ResourceProps } from "./resource"
export type { ResourcePageProps } from "./resource-page"
export type { ResourceTableViewProps } from "./resource-table-view"

// ── Shared Types ──
export type {
    ResourceColumns,
    ResourceContext,
    ResourceContextValue,
    ResourceDataViewComponent,
    ResourceFormProps,
    ResourceItem,
    ResourceProviderConfig,
    ResourceRender,
    ResourceTableHelpers,
    UseResourceOptions,
} from "./types"

// ── Compound Component Types ──
export type { ResourceProviderProps } from "./resource-context"
export type { ResourceLayoutProps } from "./resource-layout"
export type { ResourceTableProps } from "./resource-table"
export type { ResourceGridProps } from "./resource-grid"
export type { UseResourceQueryResult } from "./use-resource-query"
export type { UseResourceMutationsResult } from "./use-resource-mutations"