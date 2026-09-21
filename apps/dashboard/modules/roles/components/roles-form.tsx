"use client"

import { useTranslations } from "next-intl"
import { type RolesClient } from "@devloggers/api-client"
import { ResourceFormShell, RhfLocalizedTextField } from "@/shared/components/form"
import type { ResourceFormProps } from "@/shared/data-view/resource"
import { useResourceFormController } from "@/shared/hooks/use-resource-form-controller"
import { rolesFormConfig, type RoleFormValues } from "../roles.config"
import { RolePermissionsField } from "./role-permissions-field"

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

    const isSystem = ctrl.form.watch("isSystem") === true
    const readOnly = ctrl.isBusy || isSystem

    return (
        <ResourceFormShell ctrl={ctrl}>
            {isSystem && (
                <p className="text-sm text-muted-foreground">{t("systemRoleNotice")}</p>
            )}
            <RhfLocalizedTextField
                name="name"
                label={t("name")}
                required
                disabled={readOnly}
                placeholder={{ ar: t("namePlaceholderAr"), en: t("namePlaceholderEn") }}
            />
            <RhfLocalizedTextField
                name="description"
                label={t("description")}
                disabled={readOnly}
                placeholder={{ ar: t("descriptionPlaceholderAr"), en: t("descriptionPlaceholderEn") }}
            />
            <RolePermissionsField disabled={readOnly} />
        </ResourceFormShell>
    )
}
