import { z } from "zod"
import type { CreateExpenseDto, UpdateExpenseDto, ExpenseStatus } from "@devloggers/api-contracts"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"

export type { ExpenseStatus }

export type ExpenseRelationalField = { id: string }

const relational = z.object({ id: z.string() }).passthrough().nullable()

// ── Item schema ────────────────────────────────────────────────────────────────

export const expenseItemSchema = z.object({
    _account: z.object({ id: z.string() }).passthrough().nullable().optional(),
    description: z.string().trim().min(1, "Description is required"),
    amount: z.coerce.number().min(0.01, "Amount must be > 0"),
    notes: z.string().optional(),
    sortOrder: z.number().optional(),
}).superRefine((data, ctx) => {
    if (!data._account?.id) {
        ctx.addIssue({ code: "custom", path: ["_account"], message: "Account is required" })
    }
})

export type ExpenseItemFormValues = z.infer<typeof expenseItemSchema>

// ── Form schema ────────────────────────────────────────────────────────────────

export const expenseFormSchema = z.object({
    date: z.string().min(1, "Date is required"),
    cashbox: relational,
    currency: relational,
    fiscalPeriod: relational,
    exchangeRate: z.coerce.number().min(0.0001).default(1),
    notes: z.string().optional(),
    items: z.array(expenseItemSchema).min(1, "At least one item is required"),
}).superRefine((data, ctx) => {
    const required = [
        ["cashbox", "Cashbox is required"],
        ["currency", "Currency is required"],
        ["fiscalPeriod", "Fiscal period is required"],
    ] as const
    for (const [key, msg] of required) {
        if (!data[key]) {
            ctx.addIssue({ code: "custom", path: [key], message: msg })
        }
    }
})

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>

// ── Defaults ───────────────────────────────────────────────────────────────────

export const DEFAULT_EXPENSE_ITEM: ExpenseItemFormValues = {
    _account: null,
    description: "",
    amount: 0,
    notes: "",
}

export const DEFAULT_EXPENSE_FORM_VALUES: ExpenseFormValues = {
    date: new Date().toISOString().split("T")[0]!,
    cashbox: null,
    currency: null,
    fiscalPeriod: null,
    exchangeRate: 1,
    notes: "",
    items: [{ ...DEFAULT_EXPENSE_ITEM }],
}

// ── Mapper ─────────────────────────────────────────────────────────────────────

interface ExpenseApiData {
    date?: string
    cashboxId?: string
    currencyId?: string
    fiscalPeriodId?: string
    exchangeRate?: number | string
    notes?: string | null
    items?: Array<{
        accountId?: string
        description?: string
        amount?: number
        notes?: string | null
        sortOrder?: number
    }>
}

export function mapExpenseToFormValues(data: unknown): ExpenseFormValues {
    const resolved = unwrapApiData<ExpenseApiData>(data)
    return {
        date: resolved.date
            ? new Date(resolved.date).toISOString().split("T")[0]!
            : new Date().toISOString().split("T")[0]!,
        cashbox: resolved.cashboxId ? { id: resolved.cashboxId } : null,
        currency: resolved.currencyId ? { id: resolved.currencyId } : null,
        fiscalPeriod: resolved.fiscalPeriodId ? { id: resolved.fiscalPeriodId } : null,
        exchangeRate: Number(resolved.exchangeRate) || 1,
        notes: resolved.notes ?? "",
        items: resolved.items?.length
            ? resolved.items.map((item) => ({
                _account: item.accountId ? { id: item.accountId } : null,
                description: item.description ?? "",
                amount: Number(item.amount) || 0,
                notes: item.notes ?? "",
                sortOrder: item.sortOrder,
            }))
            : [{ ...DEFAULT_EXPENSE_ITEM }],
    }
}

// ── DTO builders ───────────────────────────────────────────────────────────────

export function toCreateExpenseDto(values: ExpenseFormValues): CreateExpenseDto {
    return {
        date: values.date,
        cashboxId: values.cashbox?.id ?? "",
        currencyId: values.currency?.id ?? "",
        fiscalPeriodId: values.fiscalPeriod?.id ?? "",
        exchangeRate: values.exchangeRate,
        notes: values.notes || undefined,
        items: values.items.map((item, index) => ({
            accountId: item._account?.id ?? "",
            description: item.description,
            amount: item.amount,
            notes: item.notes || undefined,
            sortOrder: item.sortOrder ?? index,
        })),
    }
}

export function toUpdateExpenseDto(values: ExpenseFormValues): UpdateExpenseDto {
    return {
        date: values.date,
        cashboxId: values.cashbox?.id ?? "",
        currencyId: values.currency?.id ?? "",
        fiscalPeriodId: values.fiscalPeriod?.id ?? "",
        exchangeRate: values.exchangeRate,
        notes: values.notes || undefined,
        items: values.items.map((item, index) => ({
            accountId: item._account?.id ?? "",
            description: item.description,
            amount: item.amount,
            notes: item.notes || undefined,
            sortOrder: item.sortOrder ?? index,
        })),
    }
}

// ── Totals ─────────────────────────────────────────────────────────────────────

export function computeExpenseTotal(items: ExpenseItemFormValues[]): number {
    return items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
}
