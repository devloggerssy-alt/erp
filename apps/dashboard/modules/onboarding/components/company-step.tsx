"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select"
import { useApi } from "@/shared/useApi"
import {
    companyStepSchema, DEFAULT_COMPANY_VALUES,
    type CompanyStepValues,
} from "../onboarding.config"

const TIMEZONES = ["UTC", "Asia/Damascus", "Asia/Riyadh", "Europe/Istanbul", "America/New_York"]
const LOCALES = [
    { value: "en", label: "English" },
    { value: "ar", label: "العربية" },
    { value: "tr", label: "Türkçe" },
]
const DATE_FORMATS = ["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"]
const NUMBER_FORMATS = ["1,234.56", "1.234,56"]

type Props = { onSuccess: () => void; initialName?: string }

export function CompanyStep({ onSuccess, initialName }: Props) {
    const api = useApi()
    const t = useTranslations("business")
    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CompanyStepValues>({
        resolver: zodResolver(companyStepSchema),
        defaultValues: { ...DEFAULT_COMPANY_VALUES, name: initialName ?? "" },
    })

    const { mutate, isPending, error } = useMutation({
        mutationFn: (values: CompanyStepValues) => api.onboarding.stepCompany(values),
        onSuccess,
    })

    return (
        <form onSubmit={handleSubmit((v) => mutate(v))} className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">{t("onboarding.company.name")} *</label>
                <Input {...register("name")} placeholder={t("onboarding.company.namePlaceholder")} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">{t("onboarding.company.address")}</label>
                <Input {...register("address")} placeholder="123 Main St" />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">{t("onboarding.company.phone")}</label>
                <Input {...register("phone")} type="tel" />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">{t("onboarding.company.language")} *</label>
                <Select defaultValue={watch("locale")} onValueChange={(v) => setValue("locale", v as "en" | "ar" | "tr")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {LOCALES.map((l) => (
                            <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors.locale && <p className="text-sm text-destructive">{errors.locale.message}</p>}
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">{t("onboarding.company.timezone")} *</label>
                <Select defaultValue={watch("timezone")} onValueChange={(v) => setValue("timezone", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {TIMEZONES.map((tz) => (
                            <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors.timezone && <p className="text-sm text-destructive">{errors.timezone.message}</p>}
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">{t("onboarding.company.dateFormat")} *</label>
                <Select defaultValue={watch("dateFormat")} onValueChange={(v) => setValue("dateFormat", v as "YYYY-MM-DD" | "DD/MM/YYYY" | "MM/DD/YYYY")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {DATE_FORMATS.map((f) => (
                            <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors.dateFormat && <p className="text-sm text-destructive">{errors.dateFormat.message}</p>}
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">{t("onboarding.company.numberFormat")} *</label>
                <Select defaultValue={watch("numberFormat")} onValueChange={(v) => setValue("numberFormat", v as "1,234.56" | "1.234,56")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {NUMBER_FORMATS.map((f) => (
                            <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors.numberFormat && <p className="text-sm text-destructive">{errors.numberFormat.message}</p>}
            </div>
            {error && <p className="text-sm text-destructive">{error.message}</p>}
            <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? t("onboarding.buttons.saving") : t("onboarding.buttons.continue")}
            </Button>
        </form>
    )
}
