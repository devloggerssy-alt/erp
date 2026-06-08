"use client"

import { useEffect, useMemo } from "react"
import { useTranslations } from "next-intl"
import { type AccountsClient } from "@devloggers/api-client"
import { accountResource } from "@devloggers/api-contracts"
import { ResourceFormShell, RhfTextField, RhfLocalizedTextField, RhfCheckboxField, RhfSelectField } from "@/shared/components/form"
import type { ResourceFormProps } from "@/shared/data-view/resource"
import { useResourceFormController } from "@/shared/hooks/use-resource-form-controller"
import { accountsFormConfig, type AccountFormValues } from "../accounts.config"
import { ACCOUNT_TYPES } from "../lib/account-types"
import { useAccountDraftStore } from "../accounts-draft.store"
import { RhfAccountField } from "./account-picker"

export function AccountsForm({ resourceId, initialData, onSuccess, paramKey }: ResourceFormProps<AccountsClient>) {
    const t = useTranslations("business.resources.accounts")
    const tf = useTranslations("system.resourceForm")
    const draft = useAccountDraftStore((s) => s.draft)

    const ctrl = useResourceFormController<AccountsClient, AccountFormValues>({
        config: accountsFormConfig,
        getClient: (api) => api[accountResource.key],
        entityLabel: t("entity"),
        resourceId,
        initialData,
        paramKey,
        onSuccess,
    })

    const isEditing = ctrl.isEditing
    // On create, seed parent/type from the draft (set by "add child"/"add root").
    useEffect(() => {
        if (isEditing || !draft) return
        if (draft.parent) ctrl.form.setValue("parent", draft.parent)
        ctrl.form.setValue("type", draft.type)
        // run once when the draft is present for a fresh create form
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditing])

    // Type is locked: inherited from parent (child) or bucket (root) on create; immutable on edit.
    const typeLocked = isEditing || Boolean(draft)

    const typeOptions = useMemo(
        () => ACCOUNT_TYPES.map((m) => ({ value: m.type, label: t(`types.${m.labelKey}`) })),
        [t],
    )

    // The edited node cannot be its own parent (descendant guard is best-effort here:
    // the picker excludes the node id; full-subtree exclusion is enforced server-side too).
    const excludeIds = useMemo(
        () => (resourceId ? new Set([resourceId]) : undefined),
        [resourceId],
    )

    return (
        <ResourceFormShell ctrl={ctrl}>
            <RhfTextField
                name="code"
                label={t("code")}
                placeholder={t("codePlaceholder")}
                required
                disabled={ctrl.isBusy || isEditing}
            />
            <RhfLocalizedTextField
                name="name"
                label={t("name")}
                required
                disabled={ctrl.isBusy}
            />
            <RhfSelectField
                name="type"
                label={t("type")}
                options={typeOptions}
                disabled={ctrl.isBusy || typeLocked}
            />
            <RhfAccountField
                name="parent"
                label={t("parent")}
                placeholder={t("selectAccount")}
                disabled={ctrl.isBusy || Boolean(draft?.parent)}
                excludeIds={excludeIds}
            />
            {isEditing && (
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
