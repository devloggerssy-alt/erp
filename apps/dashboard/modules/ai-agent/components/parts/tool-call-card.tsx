"use client"

import type { DynamicToolUIPart } from "ai"
import { AlertCircleIcon, CheckCircle2Icon, Loader2Icon, XCircleIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { isRecord, splitToolName } from "../../ai-agent.types"

function describeOutput(output: unknown): string {
    if (isRecord(output) && typeof output.total === "number") {
        return String(output.total)
    }
    return ""
}

export function ToolCallCard({ part }: { part: DynamicToolUIPart }) {
    const t = useTranslations("business.aiAgent")
    const { resource, op } = splitToolName(part.toolName)
    const label = t("toolLabel", { op: t(`ops.${op}`), resource: t(`resources.${resource}`) })
    const count = part.state === "output-available" ? describeOutput(part.output) : ""
    const details =
        part.state === "output-available" ? part.output : part.state === "output-error" ? part.errorText : part.input

    return (
        <details className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
            <summary className="flex cursor-pointer items-center gap-2">
                {part.state === "output-available" && <CheckCircle2Icon className="size-4 text-primary" />}
                {part.state === "output-error" && <AlertCircleIcon className="size-4 text-destructive" />}
                {part.state === "output-denied" && <XCircleIcon className="size-4 text-muted-foreground" />}
                {(part.state === "input-streaming" || part.state === "input-available" || part.state === "approval-responded") && (
                    <Loader2Icon className="size-4 animate-spin" />
                )}
                <span className="font-medium">{label}</span>
                {count && <span className="text-muted-foreground">· {t("resultCount", { count })}</span>}
                {part.state === "output-denied" && <span className="text-muted-foreground">· {t("rejected")}</span>}
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded bg-background p-2 text-xs" dir="ltr">
                {JSON.stringify(details, null, 2)}
            </pre>
        </details>
    )
}
