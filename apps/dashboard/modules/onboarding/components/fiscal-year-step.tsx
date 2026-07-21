"use client"

import { useForm, useController } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { useApi } from "@/shared/useApi"
import { DatePickerField } from "@/shared/components/form/controls/date-picker-field"
import {
    fiscalYearStepSchema, DEFAULT_FISCAL_YEAR_VALUES,
    type FiscalYearStepValues,
} from "../onboarding.config"

type Props = { onSuccess: () => void }

export function FiscalYearStep({ onSuccess }: Props) {
    const api = useApi()
    const { control, register, handleSubmit, formState: { errors } } = useForm<FiscalYearStepValues>({
        resolver: zodResolver(fiscalYearStepSchema),
        defaultValues: DEFAULT_FISCAL_YEAR_VALUES,
    })

    const startDate = useController({ name: "startDate", control })
    const endDate = useController({ name: "endDate", control })

    const formattedPayload = (values: FiscalYearStepValues) => ({
        ...values,
        startDate: new Date(values.startDate).toISOString(),
        endDate: new Date(values.endDate).toISOString(),
    })

    const { mutate, isPending, error } = useMutation({
        mutationFn: (values: FiscalYearStepValues) => api.onboarding.stepFiscalYear(formattedPayload(values)),
        onSuccess,
    })

    return (
        <form onSubmit={handleSubmit((v) => mutate(v))} className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Period Name</label>
                <Input {...register("name")} placeholder={`FY ${new Date().getFullYear()}`} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">Start Date *</label>
                <DatePickerField
                    value={startDate.field.value}
                    onChange={startDate.field.onChange}
                    onBlur={startDate.field.onBlur}
                    name={startDate.field.name}
                    invalid={!!errors.startDate}
                />
                {errors.startDate && <p className="text-sm text-destructive">{errors.startDate.message}</p>}
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">End Date *</label>
                <DatePickerField
                    value={endDate.field.value}
                    onChange={endDate.field.onChange}
                    onBlur={endDate.field.onBlur}
                    name={endDate.field.name}
                    invalid={!!errors.endDate}
                />
                {errors.endDate && <p className="text-sm text-destructive">{errors.endDate.message}</p>}
            </div>
            {error && <p className="text-sm text-destructive">{error.message}</p>}
            <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Saving…" : "Continue →"}
            </Button>
        </form>
    )
}
