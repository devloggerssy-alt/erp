"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { PlusIcon } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { ExpensesResource } from "../expenses.resource"
import { createExpensesColumns } from "./expenses-columns"
import { ExpenseFormModal } from "./expense-form-modal"
import { useExpenseActions } from "../hooks/use-expense-actions"

type ModalState = { open: boolean; expenseId: string | null }

export function ExpensesPage() {
    const t = useTranslations("business.resources.expenses")

    const [modal, setModal] = useState<ModalState>({ open: false, expenseId: null })

    const openCreate = () => setModal({ open: true, expenseId: null })
    const openEdit = (id: string) => setModal({ open: true, expenseId: id })
    const closeModal = () => setModal({ open: false, expenseId: null })

    const { postExpense, cancelExpense } = useExpenseActions()

    return (
        <>
            <ExpensesResource>
                <ExpensesResource.Page
                    title={t("title")}
                    actions={
                        <Button size="sm" onClick={openCreate}>
                            <PlusIcon className="me-1.5 h-3.5 w-3.5" />
                            {t("newExpense")}
                        </Button>
                    }
                >
                    <ExpensesResource.Table
                        columns={(helpers) =>
                            // ExpensesClient.list()/show() return BaseCrudItem ({ id: string }) rather
                            // than the real Expense shape, because the expenses controller declares no
                            // response DTO (apps/api/src/modules/invoicing/expenses/expenses.controller.ts
                            // — the same gap tracked for Invoices/Payments in .github/workflows/ci.yml's
                            // known-debt notes). createExpensesColumns' accessorKey columns (number,
                            // date, status, totalAmount) genuinely don't resolve against BaseCrudItem
                            // until a real ExpenseResponseDto is added and ExpensesClient is rewritten
                            // on top of CrudClient. Not a stale cast — verified via a scratch tsc probe.
                            createExpensesColumns(helpers, t, {
                                onOpenModal: openEdit,
                                postExpense: (id) => postExpense(id),
                                cancelExpense: (id) => cancelExpense(id),
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see comment above: ExpensesClient has no typed response DTO yet
                            }) as any
                        }
                    />
                </ExpensesResource.Page>
            </ExpensesResource>

            <ExpenseFormModal
                open={modal.open}
                onClose={closeModal}
                expenseId={modal.expenseId}
                onSuccess={closeModal}
            />
        </>
    )
}
