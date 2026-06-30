"use client"

import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { useApi } from "@/shared/useApi"
import {
    documentSequencesStepSchema, DEFAULT_DOCUMENT_SEQUENCES_VALUES,
    type DocumentSequencesStepValues,
} from "../onboarding.config"

type Props = { onSuccess: () => void }

export function DocumentSequencesStep({ onSuccess }: Props) {
    const api = useApi()
    const { register, control, handleSubmit, formState: { errors } } = useForm<DocumentSequencesStepValues>({
        resolver: zodResolver(documentSequencesStepSchema),
        defaultValues: DEFAULT_DOCUMENT_SEQUENCES_VALUES,
    })

    const { fields } = useFieldArray({ control, name: "sequences" })

    const { mutate, isPending, error } = useMutation({
        mutationFn: (values: DocumentSequencesStepValues) => api.onboarding.stepDocumentSequences(values),
        onSuccess,
    })

    return (
        <form onSubmit={handleSubmit((v) => mutate(v))} className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Customize the prefix and starting number for each document type.
            </p>
            <div className="border rounded-lg divide-y">
                {fields.map((field, i) => (
                    <div key={field.id} className="p-3 grid grid-cols-3 gap-3 items-start">
                        <div className="text-sm font-medium pt-2">{field.type.replace(/_/g, " ")}</div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium">Prefix</label>
                            <Input {...register(`sequences.${i}.prefix`)} className="h-8 text-sm" />
                            {(errors.sequences as any)?.[i]?.prefix && (
                                <p className="text-xs text-destructive">{(errors.sequences as any)[i].prefix.message}</p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium">Start #</label>
                            <Input
                                {...register(`sequences.${i}.startNumber`, { valueAsNumber: true })}
                                type="number" min={1} className="h-8 text-sm"
                            />
                        </div>
                    </div>
                ))}
            </div>
            {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
            <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Saving…" : "Complete Setup →"}
            </Button>
        </form>
    )
}
