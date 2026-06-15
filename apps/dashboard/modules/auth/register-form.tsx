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
import { useAuthStore } from "@/shared/stores/auth-store"
import { cn } from "@/shared/lib/utils"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"

import { registerFormSchema, type RegisterFormValues } from "./register-form.schema"
import { useMutation } from "@tanstack/react-query"
import { Alert, AlertTitle } from "@/shared/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import { api } from "@devloggers/api-client"

export function RegisterForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const t = useTranslations()
    const locale = useLocale()
    const router = useRouter()
    const login = useAuthStore((state) => state.login)

    const localizedHref = (href: string) => (href === "/" ? `/${locale}` : `/${locale}${href}`)

    const {
        handleSubmit,
        register,
        formState: { errors },
    } = useForm<RegisterFormValues>({
        resolver: zodResolver(registerFormSchema),
        defaultValues: {
            companyName: "",
            fullName: "",
            email: "",
            password: "",
            phone: "",
        },
    })

    const { mutate, error, isPending: isSubmitting } = useMutation({
        mutationFn: (values: RegisterFormValues) => api.auth.register(values),
        onSuccess: async ({ data }) => {
            if (data?.accessToken && data.user) {
                await login(data.accessToken, data.user)
                router.push(localizedHref("/"))
            }
        },
    })

    function onSubmit(values: RegisterFormValues) {
        mutate({
            ...values,
            phone: values.phone?.trim() || undefined,
        })
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
                    <CardTitle>{t("system.auth.register.title")}</CardTitle>
                    <CardDescription>{t("system.auth.register.description")}</CardDescription>
                </CardHeader>
                <CardContent>
                    {error ? (
                        <Alert variant="destructive" className="mb-4">
                            <AlertTriangle className="me-2 h-4 w-4" />
                            <AlertTitle>{t("system.auth.register.errorTitle")}</AlertTitle>
                            {error.message}
                        </Alert>
                    ) : null}

                    <form onSubmit={handleSubmit(onSubmit)} noValidate>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="companyName">
                                    {t("system.auth.register.companyName")}
                                </FieldLabel>
                                <Input
                                    id="companyName"
                                    type="text"
                                    placeholder={t("system.auth.register.companyNamePlaceholder")}
                                    aria-invalid={!!errors.companyName}
                                    {...register("companyName")}
                                />
                                <FieldError errors={[errors.companyName]} />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="fullName">
                                    {t("system.auth.register.fullName")}
                                </FieldLabel>
                                <Input
                                    id="fullName"
                                    type="text"
                                    placeholder={t("system.auth.register.fullNamePlaceholder")}
                                    aria-invalid={!!errors.fullName}
                                    {...register("fullName")}
                                />
                                <FieldError errors={[errors.fullName]} />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="email">{t("system.auth.register.email")}</FieldLabel>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder={t("system.auth.register.emailPlaceholder")}
                                    aria-invalid={!!errors.email}
                                    {...register("email")}
                                />
                                <FieldError errors={[errors.email]} />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="phone">{t("system.auth.register.phone")}</FieldLabel>
                                <Input
                                    id="phone"
                                    type="tel"
                                    placeholder={t("system.auth.register.phonePlaceholder")}
                                    aria-invalid={!!errors.phone}
                                    {...register("phone")}
                                />
                                <FieldError errors={[errors.phone]} />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="password">
                                    {t("system.auth.register.password")}
                                </FieldLabel>
                                <Input
                                    id="password"
                                    type="password"
                                    aria-invalid={!!errors.password}
                                    {...register("password")}
                                />
                                <FieldError errors={[errors.password]} />
                            </Field>
                            <Field>
                                <Button type="submit" disabled={isSubmitting} className="w-full">
                                    {isSubmitting
                                        ? t("system.auth.register.submitting")
                                        : t("system.auth.register.submit")}
                                </Button>
                                <FieldDescription className="text-center">
                                    {t("system.auth.register.hasAccount")}{" "}
                                    <Link href="/login" className="underline underline-offset-4">
                                        {t("system.auth.register.loginLink")}
                                    </Link>
                                </FieldDescription>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
