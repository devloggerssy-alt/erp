"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card"
import { usePosSettings } from "../hooks"

export function PosSetupCta() {
    const t = useTranslations("business.pos")
    const { provision, isProvisioning } = usePosSettings()

    return (
        <div className="flex h-[calc(100vh-6rem)] items-center justify-center">
            <Card className="max-w-md">
                <CardHeader>
                    <CardTitle>{t("setupTitle")}</CardTitle>
                    <CardDescription>{t("setupDescription")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => provision()} disabled={isProvisioning}>
                        {isProvisioning ? t("provisioning") : t("setupAction")}
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
