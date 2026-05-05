"use client"

import {
    parseAsInteger,
    parseAsString,
    parseAsStringEnum,
    createSearchParamsCache,
} from "nuqs/server"
 
export const dataTableSearchParams = {
    page: parseAsInteger.withDefault(1),
    per_page: parseAsInteger.withDefault(20),
    sort_by: parseAsString,
    sort_order: parseAsStringEnum(["asc", "desc"] as const),
}

export const dataViewSearchParams = dataTableSearchParams

export type DataTableSearchParams = typeof dataTableSearchParams
export type DataViewSearchParams = typeof dataViewSearchParams

export const dataTableSearchParamsCache = createSearchParamsCache(dataTableSearchParams)
export const dataViewSearchParamsCache = dataTableSearchParamsCache
