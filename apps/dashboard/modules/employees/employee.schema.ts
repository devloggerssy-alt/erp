import { z } from "zod"

const relationFieldSchema = z
    .object({ value: z.string(), label: z.string() })
    .nullable()

const STATUS_OPTIONS = ["active", "inactive"] as const
const TYPE_OPTIONS = ["employee", "contractor"] as const

const employeeFormSchema = z.object({
    department: relationFieldSchema,
    shop_calender: relationFieldSchema,
    shop_timing: relationFieldSchema,
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    email: z.union([
        z.string().email("Enter a valid email address"),
        z.literal(""),
    ]).optional(),
    phone: z.string().optional(),
    position: z.string().optional(),
    status: z.string().optional(),
    type: z.string().optional(),
    track_attendance: z.boolean(),
    notify_owner_when_punch_in_out: z.boolean(),
    geo_fence_radius: z.coerce.number().min(0).optional(),
})

type EmployeeFormValues = z.infer<typeof employeeFormSchema>

export { employeeFormSchema, relationFieldSchema, STATUS_OPTIONS, TYPE_OPTIONS }
export type { EmployeeFormValues }
