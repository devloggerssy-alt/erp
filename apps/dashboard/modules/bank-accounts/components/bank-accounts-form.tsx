"use client"

import { useTranslations } from "next-intl"
import type { BankAccountsClient, CurrenciesClient } from "@devloggers/api-client"
import {
    ResourceFormShell,
    RhfCheckboxField,
    RhfTextField,
    RhfLocalizedTextField,
    RhfResourceSelect,
} from "@/shared/components/form"
import type { ResourceFormProps } from "@/shared/data-view/resource"
import { useResourceFormController } from "@/shared/hooks/use-resource-form-controller"
import { bankAccountsFormConfig, type BankAccountFormValues, type BankAccountRelationalField } from "../bank-accounts.config"

export function BankAccountsForm({ resourceId, initialData, onSuccess, paramKey }: ResourceFormProps<BankAccountsClient>) {
    const t = useTranslations("business.resources.bankAccounts")
    const tf = useTranslations("system.resourceForm")

    const ctrl = useResourceFormController<BankAccountsClient, BankAccountFormValues>({
        config: bankAccountsFormConfig,
        getClient: (api) => api["bank-accounts"],
        entityLabel: t("entity"),
        resourceId,
        initialData,
        paramKey,
        onSuccess,
    })

    return (
        <ResourceFormShell ctrl={ctrl}>
            <RhfTextField
                name="code"
                label={t("code")}
                placeholder={t("codeAuto")}
                disabled={ctrl.isBusy || ctrl.isEditing}
            />
            <RhfLocalizedTextField
                name="name"
                label={t("name")}
                required
                disabled={ctrl.isBusy}
            />
            <RhfResourceSelect<BankAccountFormValues, "currency", CurrenciesClient, BankAccountRelationalField>
                name="currency"
                label={t("currency")}
                client={(api) => api.currencies}
                getLabel={(it) => `${it.code} — ${it.name}`}
                getValue={(it) => it}
                required
                disabled={ctrl.isBusy || ctrl.isEditing}
            />
            <RhfTextField name="accountNumber" label={t("accountNumber")} placeholder={t("accountNumberPlaceholder")} disabled={ctrl.isBusy} />
            <RhfTextField name="bankName" label={t("bankName")} placeholder={t("bankNamePlaceholder")} disabled={ctrl.isBusy} />
            {ctrl.isEditing && (
                <RhfCheckboxField
                    name="isActive"
                    label={t("active")}
                    description={tf("activeDescription")}
                    disabled={ctrl.isBusy}
                />
            )}
        </ResourceFormShell>
    )
}
