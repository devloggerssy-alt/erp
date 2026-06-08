import type { AccountType } from "@devloggers/api-contracts"
import {
    Landmark,
    CreditCard,
    PiggyBank,
    TrendingUp,
    TrendingDown,
    type LucideIcon,
} from "lucide-react"

export type AccountTypeMeta = {
    type: AccountType
    /** i18n key under business.resources.accounts.types */
    labelKey: string
    icon: LucideIcon
    /** Centralized categorical accent classes (token-themeable in one place). */
    dotClass: string
    badgeClass: string
}

/** Fixed display order for the five top-level buckets. */
export const ACCOUNT_TYPES: AccountTypeMeta[] = [
    { type: "ASSET", labelKey: "ASSET", icon: Landmark, dotClass: "bg-emerald-500", badgeClass: "border-emerald-500/30 text-emerald-700 dark:text-emerald-400" },
    { type: "LIABILITY", labelKey: "LIABILITY", icon: CreditCard, dotClass: "bg-rose-500", badgeClass: "border-rose-500/30 text-rose-700 dark:text-rose-400" },
    { type: "EQUITY", labelKey: "EQUITY", icon: PiggyBank, dotClass: "bg-violet-500", badgeClass: "border-violet-500/30 text-violet-700 dark:text-violet-400" },
    { type: "REVENUE", labelKey: "REVENUE", icon: TrendingUp, dotClass: "bg-sky-500", badgeClass: "border-sky-500/30 text-sky-700 dark:text-sky-400" },
    { type: "EXPENSE", labelKey: "EXPENSE", icon: TrendingDown, dotClass: "bg-amber-500", badgeClass: "border-amber-500/30 text-amber-700 dark:text-amber-400" },
]

export const ACCOUNT_TYPE_ORDER: AccountType[] = ACCOUNT_TYPES.map((t) => t.type)

export function accountTypeMeta(type: AccountType): AccountTypeMeta {
    return ACCOUNT_TYPES.find((t) => t.type === type) ?? ACCOUNT_TYPES[0]
}
