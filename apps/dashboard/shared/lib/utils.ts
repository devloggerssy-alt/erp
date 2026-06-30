import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { ApiError } from "@devloggers/api-client"

export type RelationFieldValue = { value: string; label: string } | null

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Build a `{ value, label }` relation object from an API id + name pair.
 * Returns `null` when `id` is absent so the field stays clearable.
 */
export function toRelation(id: unknown, name?: string): RelationFieldValue {
  if (id == null) return null
  if (typeof id === "object" && id !== null && "value" in id && "label" in id) {
    return id as { value: string; label: string }
  }
  return { value: String(id), label: name ?? String(id) }
}

/** Extract a numeric ID from a relation object for API payloads. */
export function toId(relation: RelationFieldValue | undefined): number | undefined {
  return relation ? Number(relation.value) : undefined
}

/**
 * Returns the API/Error message when available, otherwise the provided fallback.
 * Pass as the `error` callback in `toast.promise` to surface real API errors
 * (409 conflict, validation, 500, network) instead of a fixed generic string.
 */
export function toastErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

