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
                            createExpensesColumns(helpers, t, {
                                onOpenModal: openEdit,
                                postExpense: (id) => postExpense(id),
                                cancelExpense: (id) => cancelExpense(id),
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
