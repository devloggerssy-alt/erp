import { z } from "zod"

const registerFormSchema = z.object({
  companyName: z.string().trim().min(2, "Company name must be at least 2 characters"),
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters"),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().trim().optional(),
})

type RegisterFormValues = z.infer<typeof registerFormSchema>

export { registerFormSchema }
export type { RegisterFormValues }
