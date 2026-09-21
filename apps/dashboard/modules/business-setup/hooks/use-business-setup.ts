"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { useApi } from "@/shared/useApi"
import { toastErrorMessage } from "@/shared/lib/utils"
import { businessSetupStateKey, useSetupReadiness, type BusinessSetupState } from "@/shared/hooks/use-setup-readiness"

export type SetupTask = BusinessSetupState["tasks"][number]
export type SetupTaskType = SetupTask["type"]
export type SetupTaskStatus = SetupTask["status"]
export type SetupNextAction = NonNullable<BusinessSetupState["nextAction"]>

export function useBusinessSetup() {
  const api = useApi()
  const t = useTranslations("business.businessSetup")
  const queryClient = useQueryClient()
  const { allowed, isLoading, state } = useSetupReadiness()

  const invalidate = () => queryClient.invalidateQueries({ queryKey: businessSetupStateKey })

  const executeTask = useMutation({
    mutationFn: (type: SetupTaskType) => api["business-setup"].executeTask(type, {}),
    onSuccess: invalidate,
    onError: (error) => toast.error(toastErrorMessage(error, t("actions.failed"))),
  })

  const skipTask = useMutation({
    mutationFn: (type: SetupTaskType) => api["business-setup"].skipTask(type),
    onSuccess: invalidate,
    onError: (error) => toast.error(toastErrorMessage(error, t("actions.failed"))),
  })

  return { allowed, isLoading, state, executeTask, skipTask }
}
