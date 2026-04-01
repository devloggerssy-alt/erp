import { z } from "zod"

const loginFormSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

type LoginFormValues = z.infer<typeof loginFormSchema>

export { loginFormSchema }
export type { LoginFormValues }