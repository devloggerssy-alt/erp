"use client"

import { useTranslations } from "next-intl"

/**
 * Validation messages travel as keys from the static Zod schemas to the
 * display layer, where they are translated. Keeping the map explicit keeps
 * next-intl's key types intact.
 */
const VALIDATION_MESSAGES = {
    "validation.arabicNameRequired": "arabicNameRequired",
    "validation.arabicValueRequired": "arabicValueRequired",
    "validation.branchRequired": "branchRequired",
    "validation.warehouseBranchRequired": "warehouseBranchRequired",
    "validation.currencyRequired": "currencyRequired",
    "validation.cashboxRequired": "cashboxRequired",
    "validation.dateRequired": "dateRequired",
    "validation.fiscalPeriodRequired": "fiscalPeriodRequired",
    "validation.lineRequired": "lineRequired",
    "validation.itemsRequired": "itemsRequired",
    "validation.amountPositive": "amountPositive",
    "validation.itemRequired": "itemRequired",
    "validation.unitRequired": "unitRequired",
    "validation.accountRequired": "accountRequired",
    "validation.descriptionRequired": "descriptionRequired",
    "validation.invoiceTypeRequired": "invoiceTypeRequired",
    "validation.partyRequired": "partyRequired",
    "validation.openingPaymentCashboxRequired": "openingPaymentCashboxRequired",
} as const

type ValidationMessage = keyof typeof VALIDATION_MESSAGES

function isValidationMessage(message: string): message is ValidationMessage {
    return message in VALIDATION_MESSAGES
}

/** Translates a `validation.*` message key; other messages pass through. */
export function useFieldErrorMessage(message?: string): string | undefined {
    const t = useTranslations("system.validation")

    if (!message || !isValidationMessage(message)) return message
    return t(VALIDATION_MESSAGES[message])
}
