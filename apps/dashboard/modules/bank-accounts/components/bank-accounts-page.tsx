"use client"

import { useTranslations } from "next-intl"
import { BankAccountsResource } from "../bank-accounts.resource"
import { createBankAccountsColumns } from "./bank-accounts-columns"
import { BankAccountsForm } from "./bank-accounts-form"

export function BankAccountsPage() {
    const t = useTranslations("business.resources.bankAccounts")

    return (
        <BankAccountsResource>
            <BankAccountsResource.Page
                title={t("title")}
                actions={
                    <BankAccountsResource.FormDialog
                        title={(it) => (it?.id ? it.name ?? t("entity") : t("addAction"))}
                        form={BankAccountsForm}
                    />
                }
            >
                <BankAccountsResource.Table columns={createBankAccountsColumns} />
            </BankAccountsResource.Page>
        </BankAccountsResource>
    )
}
