"use client"

import {
    parseAsInteger,
    parseAsString,
    parseAsStringEnum,
    createSearchParamsCache,
} from "nuqs/server"
import { DEFAULT_PER_PAGE } from "@garage/api"

export const dataTableSearchParams = {
    page: parseAsInteger.withDefault(1),
    per_page: parseAsInteger.withDefault(DEFAULT_PER_PAGE),
    sort_by: parseAsString,
    sort_order: parseAsStringEnum(["asc", "desc"] as const),
}

export type DataTableSearchParams = typeof dataTableSearchParams

export const dataTableSearchParamsCache = createSearchParamsCache(dataTableSearchParams)
