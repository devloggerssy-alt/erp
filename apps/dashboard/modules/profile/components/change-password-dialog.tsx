"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { AlertTriangle, KeyRound } from "lucide-react"

import { Rhform, RhfTextField } from "@/shared/components/form"
import { Alert, AlertTitle } from "@/shared/components/ui/alert"
import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog"
import { useApi } from "@/shared/useApi"
import { useFormMutation } from "@/shared/hooks/use-form-mutation"
import { toastErrorMessage } from "@/shared/lib/utils"
import {
  createChangePasswordSchema,
  DEFAULT_CHANGE_PASSWORD_FORM_VALUES,
  ME_QUERY_KEY,
  type ChangePasswordFormValues,
} from "../profile.config"

export function ChangePasswordDialog() {
  const api = useApi()
  const t = useTranslations("system.profile")
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const schema = useMemo(
    () =>
      createChangePasswordSchema({
        minLength: t("passwordMinLength"),
        mismatch: t("passwordMismatch"),
        sameAsCurrent: t("passwordSameAsCurrent"),
      }),
    [t],
  )

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_CHANGE_PASSWORD_FORM_VALUES,
  })

  const { mutate, error, isPending } = useFormMutation(form, {
    mutationFn: (values: ChangePasswordFormValues) => {
      const promise = api.auth.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      toast.promise(promise, {
        loading: t("updatingPassword"),
        success: t("passwordUpdated"),
        error: (err) => toastErrorMessage(err, t("passwordUpdateFailed")),
      })
      return promise
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY })
      form.reset(DEFAULT_CHANGE_PASSWORD_FORM_VALUES)
      setOpen(false)
    },
  })

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) form.reset(DEFAULT_CHANGE_PASSWORD_FORM_VALUES)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <KeyRound />
          {t("changePassword")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("changePassword")}</DialogTitle>
          <DialogDescription>{t("changePasswordDescription")}</DialogDescription>
        </DialogHeader>
        <Rhform form={form} onSubmit={(values) => mutate(values)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="me-2 h-4 w-4" />
              <AlertTitle>{t("passwordUpdateFailed")}</AlertTitle>
              {error.message}
            </Alert>
          )}
          <RhfTextField
            name="currentPassword"
            type="password"
            label={t("currentPassword")}
            required
            disabled={isPending}
          />
          <RhfTextField
            name="newPassword"
            type="password"
            label={t("newPassword")}
            description={t("passwordMinLength")}
            required
            disabled={isPending}
          />
          <RhfTextField
            name="confirmNewPassword"
            type="password"
            label={t("confirmPassword")}
            required
            disabled={isPending}
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={isPending}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t("updatingPassword") : t("updatePassword")}
            </Button>
          </DialogFooter>
        </Rhform>
      </DialogContent>
    </Dialog>
  )
}
