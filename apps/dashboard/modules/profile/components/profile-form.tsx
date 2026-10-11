"use client"

import { useTranslations } from "next-intl"
import { AlertTriangle, Save } from "lucide-react"

import { Rhform, RhfImageField, RhfTextField } from "@/shared/components/form"
import { Alert, AlertTitle } from "@/shared/components/ui/alert"
import { Button } from "@/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import { FieldGroup } from "@/shared/components/ui/field"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { useAuth } from "@/shared/hooks/use-auth"
import { useSettingsSection } from "@/shared/hooks/use-settings-section"
import { useAuthStore } from "@/shared/stores/auth-store"
import { useApi } from "@/shared/useApi"
import { refreshUserCookie } from "@/modules/auth/auth.actions"
import {
  ME_QUERY_KEY,
  mapUserToProfileValues,
  profileSchema,
  toUpdateProfile,
  type ProfileFormValues,
} from "../profile.config"
import { useAvatarUpload } from "../hooks/use-avatar-upload"
import { ChangePasswordDialog } from "./change-password-dialog"

export function ProfileForm() {
  const api = useApi()
  const t = useTranslations("system.profile")
  const { user } = useAuth()
  const uploadAvatar = useAvatarUpload()

  const ctrl = useSettingsSection<ProfileFormValues>({
    schema: profileSchema,
    defaultValues: mapUserToProfileValues(user),
    queryKey: ME_QUERY_KEY,
    load: async () => mapUserToProfileValues(await api.auth.me()),
    submit: (values) => api.users.updateMe(toUpdateProfile(values)),
    messages: { saving: t("saving"), saved: t("saved"), failed: t("saveFailed") },
    // Keep the header name/avatar and the auth_user cookie in sync after a save.
    onSuccess: async () => {
      await refreshUserCookie()
      await useAuthStore.getState().hydrate()
    },
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </div>
        <ChangePasswordDialog />
      </CardHeader>
      <CardContent>
        <Rhform form={ctrl.form} onSubmit={ctrl.onSubmit}>
          {ctrl.error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="me-2 h-4 w-4" />
              <AlertTitle>{t("saveFailed")}</AlertTitle>
              {ctrl.error.message}
            </Alert>
          )}
          <FieldGroup>
            <RhfImageField
              name="avatarUrl"
              label={t("avatar")}
              description={t("avatarHint")}
              onUpload={uploadAvatar}
              disabled={ctrl.isBusy}
            />
            <RhfTextField name="fullName" label={t("fullName")} required disabled={ctrl.isBusy} />
            <RhfTextField name="phone" label={t("phone")} disabled={ctrl.isBusy} />
            <div className="grid gap-2">
              <Label htmlFor="profile-email">{t("email")}</Label>
              <Input id="profile-email" value={user?.email ?? ""} disabled readOnly />
              <p className="text-xs text-muted-foreground">{t("emailHint")}</p>
            </div>
            <Button type="submit" disabled={ctrl.isBusy}>
              <Save />
              {ctrl.isBusy ? t("saving") : t("save")}
            </Button>
          </FieldGroup>
        </Rhform>
      </CardContent>
    </Card>
  )
}
