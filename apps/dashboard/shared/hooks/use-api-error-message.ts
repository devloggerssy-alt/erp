"use client"

import { useTranslations } from "next-intl"
import { BusinessErrorCode } from "@devloggers/api-contracts"
import { ApiError } from "@devloggers/api-client"
import { toastErrorMessage } from "@/shared/lib/utils"

function isBusinessErrorCode(code: string): code is BusinessErrorCode {
    return Object.prototype.hasOwnProperty.call(BusinessErrorCode, code)
}

/**
 * Resolves the message a toast should show for an API failure.
 *
 * Business rules the API refuses carry a stable `code`; those are translated
 * here so the UI never surfaces the server's English message. Anything without
 * a known code keeps the existing behaviour (server message, then fallback).
 */
export function useApiErrorMessage() {
    const t = useTranslations("system.apiErrors")

    return (error: unknown, fallback: string): string => {
        if (error instanceof ApiError && error.code && isBusinessErrorCode(error.code)) {
            return t(error.code)
        }
        return toastErrorMessage(error, fallback)
    }
}
