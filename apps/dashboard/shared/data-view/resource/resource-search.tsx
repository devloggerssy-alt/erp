"use client"

import { useEffect, useState } from "react"
import { Search, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { Input } from "@/shared/components/ui/input"
import { Button } from "@/shared/components/ui/button"
import { useResourceContext } from "./resource-context"

export type ResourceSearchProps = {
    placeholder?: string
    debounceMs?: number
}

export function ResourceSearch({
    placeholder,
    debounceMs = 300,
}: ResourceSearchProps) {
    const t = useTranslations("system.resourceSearch")
    const { params, handleChange } = useResourceContext()
    const [value, setValue] = useState(params.search ?? "")

    useEffect(() => {
        setValue(params.search ?? "")
    }, [params.search])

    useEffect(() => {
        const timer = setTimeout(() => {
            const normalized = value.trim()
            const current = params.search ?? ""
            if (normalized !== current) {
                handleChange({ type: "search", search: normalized || null })
            }
        }, debounceMs)

        return () => clearTimeout(timer)
    }, [value, debounceMs, handleChange, params.search])

    return (
        <div data-slot="resource-search" className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder ?? t("placeholder")}
                className="ps-8 pe-8"
            />
            {value && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute end-1 top-1/2 size-7 -translate-y-1/2"
                    aria-label={t("clear")}
                    onClick={() => setValue("")}
                >
                    <X className="size-3.5" />
                </Button>
            )}
        </div>
    )
}
