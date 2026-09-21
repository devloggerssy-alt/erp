import type { SetupTask, SetupTaskType } from "./hooks/use-business-setup"

export type SetupGroupKey = "accounting" | "money" | "inventory" | "parties"

/** Hub grouping (Phase 10.1.2). Every task type appears in exactly one group — pinned by setup.config.test.ts. */
export const SETUP_GROUPS: { key: SetupGroupKey; tasks: SetupTaskType[] }[] = [
  {
    key: "accounting",
    tasks: ["CURRENCIES", "FISCAL_PERIOD", "CHART_OF_ACCOUNTS", "FINANCIAL_MAPPINGS", "DOCUMENT_SEQUENCES", "RECONCILIATION"],
  },
  {
    key: "money",
    tasks: ["CASHBOXES", "BANK_ACCOUNTS", "OPENING_CASH_BALANCES", "OPENING_BANK_BALANCES"],
  },
  {
    key: "inventory",
    tasks: ["WAREHOUSES", "PRODUCTS", "OPENING_INVENTORY"],
  },
  {
    key: "parties",
    tasks: ["CUSTOMERS", "SUPPLIERS", "OPENING_RECEIVABLES", "OPENING_PAYABLES"],
  },
]

/** Where each task's work actually happens — existing CRUD pages and opening workflows (Phase 10.1.3). */
export const SETUP_TASK_LINKS: Record<SetupTaskType, string> = {
  CURRENCIES: "/settings/currencies",
  FISCAL_PERIOD: "/settings/fiscal-periods",
  CHART_OF_ACCOUNTS: "/finance/chart-of-accounts",
  FINANCIAL_MAPPINGS: "/settings/gl-accounts",
  DOCUMENT_SEQUENCES: "/settings/document-sequences",
  CASHBOXES: "/finance/cashboxes",
  BANK_ACCOUNTS: "/finance/bank-accounts",
  WAREHOUSES: "/inventory/warehouses",
  PRODUCTS: "/catalog/items",
  CUSTOMERS: "/parties/customers",
  SUPPLIERS: "/parties/suppliers",
  OPENING_CASH_BALANCES: "/finance/opening-balances",
  OPENING_BANK_BALANCES: "/finance/opening-balances",
  OPENING_RECEIVABLES: "/finance/opening-balances",
  OPENING_PAYABLES: "/finance/opening-balances",
  OPENING_INVENTORY: "/inventory/opening-balances",
  RECONCILIATION: "/setup",
}

/** Tasks the hub runs server-side (payload-free handlers). Everything else completes via discovery. */
export const EXECUTABLE_TASK_TYPES: SetupTaskType[] = ["CHART_OF_ACCOUNTS", "RECONCILIATION"]

export function computeSetupProgress(tasks: SetupTask[]): { completed: number; total: number; percent: number } {
  const required = tasks.filter((task) => task.required)
  const completed = required.filter((task) => task.status === "COMPLETED" || task.status === "SKIPPED").length
  const total = required.length
  return { completed, total, percent: total === 0 ? 100 : Math.round((completed / total) * 100) }
}

export type ReconciliationCheck = { code: string; passed: boolean; findingCount: number }

/** Defensively parses the per-check summary stored on the RECONCILIATION task's `progress` JSON. */
export function parseReconciliationChecks(progress: Record<string, unknown> | null): ReconciliationCheck[] {
  const raw = progress?.checks
  if (!Array.isArray(raw)) return []
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return []
    const { code, passed, findingCount } = entry as Record<string, unknown>
    if (typeof code !== "string" || typeof passed !== "boolean") return []
    return [{ code, passed, findingCount: typeof findingCount === "number" ? findingCount : 0 }]
  })
}
