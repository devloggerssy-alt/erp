"use client"

import { useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { itemCategoryResource } from "@devloggers/api-contracts"
import { useApi } from "@/shared/useApi"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { PlusIcon, Loader2 } from "lucide-react"

type InlineCategoryCreateProps = {
  onSuccess: (newItem?: { value: { id: string; name: string }; label: string }) => void
}

const inlineCategorySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
})

type InlineCategoryFormValues = z.infer<typeof inlineCategorySchema>

export function InlineCategoryCreateForm({ onSuccess }: InlineCategoryCreateProps) {
  const t = useTranslations("business.resources.categories")
  const api = useApi()

  const form = useForm<InlineCategoryFormValues>({
    resolver: zodResolver(inlineCategorySchema),
    defaultValues: { name: "" },
  })

  const { register, handleSubmit, formState: { isSubmitting, errors }, setError } = form

  const onSubmit = async (values: InlineCategoryFormValues) => {
    const name = (values.name ?? "").trim()
    if (!name) {
      setError("name", { message: "Name is required" })
      return
    }
    try {
      const response = await api[itemCategoryResource.key].create({ name })
      const created = unwrapApiData<{ id: string; name: string }>(response)
      if (created.id && created.name) {
        form.reset({ name: "" })
        onSuccess({ value: { id: created.id, name: created.name }, label: created.name })
      } else {
        setError("name", { message: "Failed to create category" })
      }
    } catch (err) {
      setError("name", {
        message: err instanceof Error ? err.message : "Failed to create category",
      })
    }
  }

  return (
    <form onSubmit={(e) => { e.stopPropagation(); handleSubmit(onSubmit)(e) }} className="flex flex-col gap-4">
      <div>
        <label className="text-sm font-medium mb-1.5 block">
          {t("name")}
          <span className="text-destructive ms-0.5">*</span>
        </label>
        <Input
          {...register("name")}
          placeholder={t("namePlaceholder")}
          disabled={isSubmitting}
          aria-invalid={!!errors.name}
        />
        {errors.name && (
          <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
        )}
      </div>
      <Button type="submit" variant="default" disabled={isSubmitting} className="w-full">
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin me-2" />
        ) : (
          <PlusIcon className="h-4 w-4 me-2" />
        )}
        {t("addAction")}
      </Button>
    </form>
  )
}
