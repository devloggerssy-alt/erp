"use client"

import { useController } from "react-hook-form"
import { useTranslations } from "next-intl"
import {
    PERMISSION_GROUPS,
    permissionAction,
    permissionsForResource,
    type CatalogResource,
    type PermissionKey,
} from "@devloggers/api-contracts"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { FieldError } from "@/shared/components/ui/field"
import type { RoleFormValues } from "../roles.config"

const GROUPS = Object.entries(PERMISSION_GROUPS) as Array<
    [keyof typeof PERMISSION_GROUPS, readonly CatalogResource[]]
>

export function RolePermissionsField({ disabled }: { disabled?: boolean }) {
    const t = useTranslations("business.permissions")
    const { field, fieldState } = useController<RoleFormValues, "permissionKeys">({
        name: "permissionKeys",
        disabled,
    })
    const selected = new Set(field.value)

    const toggle = (permission: PermissionKey, checked: boolean) => {
        const next = new Set(selected)
        if (checked) next.add(permission)
        else next.delete(permission)
        field.onChange([...next])
    }

    return (
        <div className="space-y-4 rounded-lg border p-4">
            <div>
                <p className="text-sm font-medium">{t("title")}</p>
                <p className="text-sm text-muted-foreground">{t("description")}</p>
            </div>
            {GROUPS.map(([group, resources]) => (
                <div key={group} className="space-y-2">
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                        {t(`groups.${group}`)}
                    </p>
                    {resources.map((resource) => (
                        <div
                            key={resource}
                            className="flex flex-wrap items-center gap-3 border-b py-1.5 last:border-b-0"
                        >
                            <span className="min-w-40 text-sm">{t(`resources.${resource}`)}</span>
                            {permissionsForResource(resource).map((permission) => (
                                <label key={permission} className="flex items-center gap-1.5 text-xs">
                                    <Checkbox
                                        checked={selected.has(permission)}
                                        onCheckedChange={(value) => toggle(permission, value === true)}
                                        disabled={field.disabled}
                                    />
                                    {t(`actions.${permissionAction(permission)}`)}
                                </label>
                            ))}
                        </div>
                    ))}
                </div>
            ))}
            {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
        </div>
    )
}
