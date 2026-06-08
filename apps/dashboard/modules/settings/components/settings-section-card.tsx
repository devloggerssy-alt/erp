"use client"

import type { ReactNode } from "react"
import { AlertTriangle, Save } from "lucide-react"
import { useTranslations } from "next-intl"
import type { FieldValues } from "react-hook-form"
import { Rhform } from "@/shared/components/form"
import { Alert, AlertTitle } from "@/shared/components/ui/alert"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { FieldGroup } from "@/shared/components/ui/field"
import type { SettingsSectionController } from "../hooks/use-settings-section"

export type SettingsSectionCardProps<TValues extends FieldValues> = {
  ctrl: SettingsSectionController<TValues>
  title: string
  description?: string
  children: ReactNode
}

export function SettingsSectionCard<TValues extends FieldValues>({
  ctrl,
  title,
  description,
  children,
}: SettingsSectionCardProps<TValues>) {
  const t = useTranslations("business.settings")
  const { form, isBusy, error, onSubmit } = ctrl

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <Rhform form={form} onSubmit={onSubmit}>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="me-2 h-4 w-4" />
              <AlertTitle>{t("saveFailed")}</AlertTitle>
              {error.message}
            </Alert>
          )}
          <FieldGroup>
            {children}
            <Button type="submit" variant="default" disabled={isBusy}>
              <Save />
              {isBusy ? t("saving") : t("save")}
            </Button>
          </FieldGroup>
        </Rhform>
      </CardContent>
    </Card>
  )
}
