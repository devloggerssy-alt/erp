"use client"

import { useTranslations } from "next-intl"
import { type UsersClient } from "@devloggers/api-client"
import { roleResource } from "@devloggers/api-contracts"
import { ResourceFormShell, RhfCheckboxField, RhfTextField, RhfResourceMultiSelect } from "@/shared/components/form"
import type { ResourceFormProps } from "@/shared/data-view/resource"
import { useResourceFormController } from "@/shared/hooks/use-resource-form-controller"
import { usersFormConfig, type UserFormValues } from "../users.config"

export function UsersForm({ resourceId, initialData, onSuccess, paramKey }: ResourceFormProps<UsersClient>) {
    const t = useTranslations("business.resources.users")
    const tf = useTranslations("system.resourceForm")

    const ctrl = useResourceFormController<UsersClient, UserFormValues>({
        config: usersFormConfig,
        getClient: (api) => api.users,
        entityLabel: t("entity"),
        resourceId,
        initialData,
        paramKey,
        onSuccess,
    })

    return (
        <ResourceFormShell ctrl={ctrl}>
            <RhfTextField
                name="email"
                label={t("email")}
                placeholder={t("emailPlaceholder")}
                required
                disabled={ctrl.isBusy}
                type="email"
            />
            {!ctrl.isEditing && (
                <RhfTextField
                    name="password"
                    label={t("password")}
                    placeholder={t("passwordPlaceholder")}
                    required
                    disabled={ctrl.isBusy}
                    type="password"
                />
            )}
            <RhfTextField
                name="fullName"
                label={t("fullName")}
                placeholder={t("fullNamePlaceholder")}
                required
                disabled={ctrl.isBusy}
            />
            <RhfTextField
                name="phone"
                label={t("phone")}
                placeholder={t("phonePlaceholder")}
                disabled={ctrl.isBusy}
            />
            <RhfResourceMultiSelect
                name="roles"
                label={t("roles")}
                placeholder={t("rolesPlaceholder")}
                client={(api) => api[roleResource.key]}
                getLabel={(item) => item.name}
                getValue={(item) => item}
                pageSize={50}
                disabled={ctrl.isBusy}
            />
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
