"use client"

import { useTranslations } from "next-intl"
import { type RolesClient } from "@devloggers/api-client"
import { ResourceFormShell, RhfLocalizedTextField } from "@/shared/components/form"
import type { ResourceFormProps } from "@/shared/data-view/resource"
import { useResourceFormController } from "@/shared/hooks/use-resource-form-controller"
import { rolesFormConfig, type RoleFormValues } from "../roles.config"

export function RolesForm({ resourceId, initialData, onSuccess, paramKey }: ResourceFormProps<RolesClient>) {
    const t = useTranslations("business.resources.roles")

    const ctrl = useResourceFormController<RolesClient, RoleFormValues>({
        config: rolesFormConfig,
        getClient: (api) => api.roles,
        entityLabel: t("entity"),
        resourceId,
        initialData,
        paramKey,
        onSuccess,
    })

    return (
        <ResourceFormShell ctrl={ctrl}>
            <RhfLocalizedTextField
                name="name"
                label={t("name")}
                required
                disabled={ctrl.isBusy}
                placeholder={{ ar: t("namePlaceholderAr"), en: t("namePlaceholderEn") }}
            />
            <RhfLocalizedTextField
                name="description"
                label={t("description")}
                disabled={ctrl.isBusy}
                placeholder={{ ar: t("descriptionPlaceholderAr"), en: t("descriptionPlaceholderEn") }}
            />
        </ResourceFormShell>
    )
}
