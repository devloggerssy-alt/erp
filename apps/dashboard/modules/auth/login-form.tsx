"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/shared/components/ui/button"
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
import { useLocale, useTranslations } from "next-intl"

import { loginFormSchema, type LoginFormValues } from "./login-form.schema"
import { useMutation } from "@tanstack/react-query"
import { Alert, AlertTitle } from "@/shared/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import { api } from "@devloggers/api-client"

export function LoginForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const t = useTranslations()
    const locale = useLocale()
    const router = useRouter()

    const lastLoginEmail = useAppStore((state) => state.lastLoginEmail)
    const setLastLoginEmail = useAppStore((state) => state.setLastLoginEmail)
    const login = useAuthStore((state) => state.login)

    const localizedHref = (href: string) => (href === "/" ? `/${locale}` : `/${locale}${href}`)

    const {
        handleSubmit,
        register,
        formState: { errors },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginFormSchema),
        defaultValues:
            process.env.NODE_ENV === "development"
                ? {
                      email: "admin@demo-shop.com",
                      password: "admin123",
                  }
                : {
                      email: lastLoginEmail,
                      password: "",
                  },
    })

    const { mutate, error, isPending: isSubmitting } = useMutation({
        mutationFn: (values: LoginFormValues) => api.auth.login(values),
        onSuccess: async ({ data }) => {
            if (data?.accessToken && data.user) {
                await login(data.accessToken, data.user)
                router.push(localizedHref("/"))
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
                        className="mx-auto mb-8 object-contain"
                        alt={t("system.common.logoAlt")}
                        src="/assets/logo.png"
                        height={400}
                        width={200}
                    />
                    <CardTitle>{t("system.auth.login.title")}</CardTitle>
                    <CardDescription>{t("system.auth.login.description")}</CardDescription>
                </CardHeader>
                <CardContent>
                    {error ? (
                        <Alert variant="destructive" className="mb-4">
                            <AlertTriangle className="me-2 h-4 w-4" />
                            <AlertTitle>{t("system.auth.login.errorTitle")}</AlertTitle>
                            {error.message}
                        </Alert>
                    ) : null}

                    <form onSubmit={handleSubmit(onSubmit)} noValidate>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="email">{t("system.auth.login.email")}</FieldLabel>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder={t("system.auth.login.emailPlaceholder")}
                                    aria-invalid={!!errors.email}
                                    {...register("email")}
                                />
                                <FieldError errors={[errors.email]} />
                            </Field>
                            <Field>
                                <div className="flex items-center">
                                    <FieldLabel htmlFor="password">
                                        {t("system.auth.login.password")}
                                    </FieldLabel>
                                    <a
                                        href="#"
                                        className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                                    >
                                        {t("system.auth.login.forgotPassword")}
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
                                    {isSubmitting
                                        ? t("system.auth.login.submitting")
                                        : t("system.auth.login.submit")}
                                </Button>

                                {lastLoginEmail ? (
                                    <FieldDescription className="text-center">
                                        {t("system.auth.login.lastEmailUsed", {
                                            email: lastLoginEmail,
                                        })}
                                    </FieldDescription>
                                ) : null}
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
