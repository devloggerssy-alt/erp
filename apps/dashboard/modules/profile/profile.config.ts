import { z } from "zod"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"

/** React Query key for the current user (`GET /auth/me`). */
export const ME_QUERY_KEY = ["auth", "me"] as const

export const profileSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().optional(),
  avatarUrl: z.string().nullable().optional(),
})
export type ProfileFormValues = z.infer<typeof profileSchema>

export const DEFAULT_PROFILE_FORM_VALUES: ProfileFormValues = {
  fullName: "",
  phone: "",
  avatarUrl: null,
}

export function mapUserToProfileValues(data: unknown): ProfileFormValues {
  const user = unwrapApiData<{ fullName?: unknown; phone?: unknown; avatarUrl?: unknown }>(data)
  return {
    fullName: typeof user.fullName === "string" ? user.fullName : "",
    phone: typeof user.phone === "string" ? user.phone : "",
    avatarUrl: typeof user.avatarUrl === "string" ? user.avatarUrl : null,
  }
}

export type UpdateProfilePayload = {
  fullName: string
  phone: string | null
  avatarUrl: string | null
}

/** Maps form values to the PATCH /users/me payload: blank phone/avatar mean "clear". */
export function toUpdateProfile(values: ProfileFormValues): UpdateProfilePayload {
  const phone = values.phone?.trim() ?? ""
  return {
    fullName: values.fullName.trim(),
    phone: phone.length > 0 ? phone : null,
    avatarUrl: values.avatarUrl ?? null,
  }
}

export type ChangePasswordMessages = {
  minLength: string
  mismatch: string
  sameAsCurrent: string
}

export function createChangePasswordSchema(messages: ChangePasswordMessages) {
  return z
    .object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8, messages.minLength),
      confirmNewPassword: z.string().min(1),
    })
    .refine((values) => values.newPassword === values.confirmNewPassword, {
      message: messages.mismatch,
      path: ["confirmNewPassword"],
    })
    .refine((values) => values.newPassword !== values.currentPassword, {
      message: messages.sameAsCurrent,
      path: ["newPassword"],
    })
}

export type ChangePasswordFormValues = z.infer<ReturnType<typeof createChangePasswordSchema>>

export const DEFAULT_CHANGE_PASSWORD_FORM_VALUES: ChangePasswordFormValues = {
  currentPassword: "",
  newPassword: "",
  confirmNewPassword: "",
}
