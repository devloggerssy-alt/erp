"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { useApi } from "@/shared/useApi"
import {
    fiscalYearStepSchema, DEFAULT_FISCAL_YEAR_VALUES,
    type FiscalYearStepValues,
} from "../onboarding.config"

type Props = { onSuccess: () => void }

export function FiscalYearStep({ onSuccess }: Props) {
    const api = useApi()
    const { register, handleSubmit, formState: { errors } } = useForm<FiscalYearStepValues>({
        resolver: zodResolver(fiscalYearStepSchema),
        defaultValues: DEFAULT_FISCAL_YEAR_VALUES,
    })

    const { mutate, isPending, error } = useMutation({
        mutationFn: (values: FiscalYearStepValues) => api.onboarding.stepFiscalYear(values),
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
                <Input {...register("startDate")} type="date" />
                {errors.startDate && <p className="text-sm text-destructive">{errors.startDate.message}</p>}
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">End Date *</label>
                <Input {...register("endDate")} type="date" />
                {errors.endDate && <p className="text-sm text-destructive">{errors.endDate.message}</p>}
            </div>
            {error && <p className="text-sm text-destructive">{error.message}</p>}
            <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Saving…" : "Continue →"}
            </Button>
        </form>
    )
}
