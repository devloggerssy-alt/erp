"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { Button } from "@/shared/components/ui/button"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { useApi } from "@/shared/useApi"

type Props = { onSuccess: () => void }

type ModuleKey = "inventory" | "sales" | "purchasing" | "accounting"

const MODULE_KEYS: ModuleKey[] = ["inventory", "sales", "purchasing", "accounting"]

export function BusinessProfileStep({ onSuccess }: Props) {
    const api = useApi()
    const t = useTranslations("business")
    const [modules, setModules] = useState<Record<ModuleKey, boolean>>({
        inventory: true, sales: true, purchasing: true, accounting: true,
    })

    const { mutate, isPending, error } = useMutation({
        mutationFn: () => api["business-setup"].setProfile({ modules }),
        onSuccess,
    })

    return (
        <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
                {t("onboarding.businessProfile.description")}
            </p>

            <div className="space-y-3">
                {MODULE_KEYS.map((key) => (
                    <label key={key} className="flex items-center gap-3 border rounded-lg p-4 text-sm">
                        <Checkbox
                            checked={modules[key]}
                            onCheckedChange={(checked) => setModules((prev) => ({ ...prev, [key]: checked === true }))}
                        />
                        {t(`onboarding.businessProfile.modules.${key}`)}
                    </label>
                ))}
            </div>

            {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}

            <Button onClick={() => mutate()} disabled={isPending} className="w-full">
                {isPending ? t("onboarding.buttons.saving") : t("onboarding.buttons.finish")}
            </Button>
        </div>
    )
}
