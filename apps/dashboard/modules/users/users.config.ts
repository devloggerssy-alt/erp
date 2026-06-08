import { z } from "zod"
import type { CreateUserDto, UpdateUserDto } from "@devloggers/api-contracts"
import type { ResourceFormConfig } from "@/shared/hooks/use-resource-form-controller"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"

const roleItemSchema = z.object({
    id: z.string(),
    name: z.string(),
})

export const userFormSchema = z.object({
    email: z.string().trim().email("Invalid email"),
    password: z.string().optional(),
    fullName: z.string().trim().min(1, "Full name is required"),
    phone: z.string().trim().optional(),
    roles: z.array(roleItemSchema).default([]),
    isActive: z.boolean().optional(),
})

export type UserFormValues = z.infer<typeof userFormSchema>

export const DEFAULT_USER_FORM_VALUES: UserFormValues = {
    email: "",
    password: "",
    fullName: "",
    phone: "",
    roles: [],
    isActive: true,
}

export function mapUserToFormValues(data: unknown): UserFormValues {
    const resolved = unwrapApiData<UserFormValues>(data)
    return {
        email: resolved.email ?? "",
        password: "",
        fullName: resolved.fullName ?? "",
        phone: resolved.phone ?? "",
        roles: resolved.roles ?? [],
        isActive: resolved.isActive ?? true,
    }
}

export const usersFormConfig: ResourceFormConfig<UserFormValues, CreateUserDto, UpdateUserDto> = {
    schema: userFormSchema,
    defaultValues: DEFAULT_USER_FORM_VALUES,
    mapToFormValues: mapUserToFormValues,
    toCreate: (values) => ({
        email: values.email.trim(),
        password: values.password || "",
        fullName: values.fullName.trim(),
        phone: values.phone?.trim() || undefined,
        roleIds: values.roles.map((r) => r.id),
    }),
    toUpdate: (values) => ({
        email: values.email.trim(),
        fullName: values.fullName.trim(),
        phone: values.phone?.trim() || undefined,
        roleIds: values.roles.map((r) => r.id),
    }),
}
