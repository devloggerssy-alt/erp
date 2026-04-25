"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/shared/components/ui/button"
import { api } from '@devloggers/api'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/shared/components/ui/card"
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/shared/components/ui/field"
import { Input } from "@/shared/components/ui/input"
import { useAppStore } from "@/shared/stores/app-store"
import { useAuthStore } from "@/shared/stores/auth-store"
import { cn } from "@/shared/lib/utils"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { loginFormSchema, type LoginFormValues } from "./login-form.schema"
import { useMutation } from "@tanstack/react-query"
import { Alert, AlertTitle } from "@/shared/components/ui/alert"
import { AlertTriangle } from "lucide-react"

export function LoginForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const lastLoginEmail = useAppStore((state) => state.lastLoginEmail)
    const setLastLoginEmail = useAppStore((state) => state.setLastLoginEmail)
    const login = useAuthStore((state) => state.login)
    const router = useRouter()
    const {
        handleSubmit,
        register,
        formState: { errors, },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginFormSchema),
        defaultValues: process.env.NODE_ENV === "development" ? {
            "email": "admin@admin.com",
            "password": "12345678"
        } : {
            email: lastLoginEmail,
            password: "",
        },
    })

    const { mutate, error, isPending: isSubmitting } = useMutation({
        mutationFn: (values: LoginFormValues) => api.auth.login(values),
        onSuccess: async (data) => {
            if (data.token && data.user) {
                await login(data.token, data.user as Parameters<typeof login>[1])
                router.push("/")
            }
        },
    })


    async function onSubmit(values: LoginFormValues) {
        setLastLoginEmail(values.email)
        mutate(values)
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader>
                    <Image
                        className="mx-auto mb-8 h-20 w-48"
                        alt="Logo"
                        src="/assets/logo.png"
                        height={200}
                        width={200}
                    />
                    <CardTitle>Login to your account</CardTitle>
                    <CardDescription>
                        Enter your email below to login to your account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error ? (
                        <Alert variant='destructive' className="mb-4">
                            <AlertTriangle className="me-2 h-4 w-4" />
                            <AlertTitle>Login failed</AlertTitle>
                            {error.message}
                        </Alert>
                    ) : null}

                    <form onSubmit={handleSubmit(onSubmit)} noValidate>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="email">Email</FieldLabel>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="m@example.com"
                                    aria-invalid={!!errors.email}
                                    {...register("email")}
                                />
                                <FieldError errors={[errors.email]} />
                            </Field>
                            <Field>
                                <div className="flex items-center">
                                    <FieldLabel htmlFor="password">Password</FieldLabel>
                                    <a
                                        href="#"
                                        className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                                    >
                                        Forgot your password?
                                    </a>
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    aria-invalid={!!errors.password}
                                    {...register("password")}
                                />
                                <FieldError errors={[errors.password]} />
                            </Field>
                            <Field>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? "Logging in..." : "Login"}
                                </Button>

                                {lastLoginEmail ? (
                                    <FieldDescription className="text-center">
                                        Last email used: {lastLoginEmail}
                                    </FieldDescription>
                                ) : null}
                                {/* <FieldDescription className="text-center">
                                    Don&apos;t have an account? <a href="#">Sign up</a>
                                </FieldDescription> */}
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
