"use client"

import { useEffect, useMemo } from "react"
import { useTranslations } from "next-intl"
import { useFieldArray, useWatch, type UseFormReturn } from "react-hook-form"
import type { FieldArrayWithId } from "react-hook-form"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useApi } from "@/shared/useApi"
import { useResourceForm } from "@/shared/hooks/use-resource-form"
import { useFormMutation } from "@/shared/hooks/use-form-mutation"
import type { ExpenseStatus } from "@devloggers/api-contracts"
import {
    DEFAULT_EXPENSE_FORM_VALUES,
    DEFAULT_EXPENSE_ITEM,
    mapExpenseToFormValues,
    expenseFormSchema,
    toCreateExpenseDto,
    toUpdateExpenseDto,
    computeExpenseTotal,
    type ExpenseFormValues,
    type ExpenseItemFormValues,
} from "../expenses.config"

// ── Types ──────────────────────────────────────────────────────────────────────

interface CachedExpenseEntry {
    data?: { status?: ExpenseStatus; number?: string }
    status?: ExpenseStatus
    number?: string
}

export type UseExpenseFormOptions = {
    expenseId: string | null
    open: boolean
    onSuccess?: () => void
    onClose: () => void
}

export type ExpenseFormController = {
    form: UseFormReturn<ExpenseFormValues>
    fields: FieldArrayWithId<ExpenseFormValues, "items">[]
    append: (item?: Partial<ExpenseItemFormValues>) => void
    remove: (index: number) => void
    isEditing: boolean
    isReadOnly: boolean
    isBusy: boolean
    isPending: boolean
    status: ExpenseStatus | undefined
    expenseNumber: string | undefined
    total: number
    onSubmit: () => void
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useExpenseForm({
    expenseId,
    open,
    onSuccess,
    onClose,
}: UseExpenseFormOptions): ExpenseFormController {
    const api = useApi()
    const tf = useTranslations("system.resourceForm")
    const t = useTranslations("business.resources.expenses")
    const queryClient = useQueryClient()

    const { form, isEditing, isInitializing } = useResourceForm<ExpenseFormValues, unknown>({
        schema: expenseFormSchema,
        defaultValues: DEFAULT_EXPENSE_FORM_VALUES,
        resourceId: expenseId,
        initialize: (id) => api.expenses.show(id),
        mapToFormValues: mapExpenseToFormValues,
        queryKey: [api.expenses.key, "show", expenseId],
    })

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "items",
    })

    const cached = isEditing
        ? queryClient.getQueryData<CachedExpenseEntry>([api.expenses.key, "show", expenseId])
        : undefined

    const status: ExpenseStatus | undefined = cached?.data?.status ?? cached?.status
    const expenseNumber: string | undefined = cached?.data?.number ?? cached?.number
    const isReadOnly = status === "POSTED" || status === "CANCELLED"

    const watchedItems = useWatch({
        control: form.control,
        name: "items",
    }) as ExpenseItemFormValues[]

    const total = useMemo(
        () => computeExpenseTotal(watchedItems ?? []),
        [watchedItems],
    )

    const { mutate, isPending } = useFormMutation(form, {
        mutationFn: (values: ExpenseFormValues) => {
            const promise = isEditing && expenseId
                ? api.expenses.update(expenseId, toUpdateExpenseDto(values))
                : api.expenses.create(toCreateExpenseDto(values))

            toast.promise(promise, {
                loading: isEditing ? tf("updating") : tf("creating"),
                success: isEditing
                    ? tf("updated", { entity: t("entity") })
                    : tf("created", { entity: t("entity") }),
                error: isEditing
                    ? tf("updateFailed", { entity: t("entity") })
                    : tf("createFailed", { entity: t("entity") }),
            })

            return promise
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.expenses.key] })
            form.reset(DEFAULT_EXPENSE_FORM_VALUES)
            onSuccess?.()
            onClose()
        },
    })

    useEffect(() => {
        if (!open) {
            form.reset(DEFAULT_EXPENSE_FORM_VALUES)
        }
    }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

    return {
        form,
        fields,
        append: (item) => append({ ...DEFAULT_EXPENSE_ITEM, ...item }),
        remove,
        isEditing,
        isReadOnly,
        isBusy: isInitializing || isPending,
        isPending,
        status,
        expenseNumber,
        total,
        onSubmit: () => form.handleSubmit((values) => mutate(values))(),
    }
}
