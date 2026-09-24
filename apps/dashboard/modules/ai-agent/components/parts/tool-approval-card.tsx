"use client"

import { useQuery } from "@tanstack/react-query"
import { ShieldAlertIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { Textarea } from "@/shared/components/ui/textarea"
import { cn } from "@/shared/lib/utils"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"
import { useApi } from "@/shared/useApi"
import {
    isRecord,
    splitToolName,
    type ApprovalRequestedPart,
    type ApprovalResponse,
    type ToolRisk,
} from "../../ai-agent.types"

/** `Api` is not re-exported from the `@devloggers/api-client` barrel; derive it from the hook. */
type Api = ReturnType<typeof useApi>

/** Current values for the before → after diff of `<resource>.update` tools. */
const CURRENT_VALUE_FETCHERS: Record<string, (api: Api, id: string) => Promise<unknown>> = {
    units: (api, id) => api.units.show(id),
    items: (api, id) => api.items.show(id),
    customers: (api, id) => api.parties.show(id),
}

function formatValue(value: unknown): string {
    if (value === null || value === undefined || value === "") return "—"
    return typeof value === "object" ? JSON.stringify(value) : String(value)
}

export function ToolApprovalCard({
    part,
    risk,
    onRespond,
}: {
    part: ApprovalRequestedPart
    risk: ToolRisk
    onRespond: (response: ApprovalResponse) => void
}) {
    const t = useTranslations("business.aiAgent")
    const api = useApi()
    const [armed, setArmed] = useState(false)
    const [rejecting, setRejecting] = useState(false)
    const [reason, setReason] = useState("")
    const { resource, op } = splitToolName(part.toolName)
    // Tool input is model-generated JSON (`unknown` in the SDK); only render it when it is an object.
    const input = isRecord(part.input) ? part.input : {}
    const id = typeof input.id === "string" ? input.id : undefined
    const fetchCurrent = op === "update" && id ? CURRENT_VALUE_FETCHERS[resource] : undefined

    const current = useQuery({
        queryKey: ["ai", "approval-current", resource, id],
        queryFn: () => (fetchCurrent && id ? fetchCurrent(api, id) : Promise.resolve(null)),
        enabled: !!fetchCurrent,
    })
    const before = unwrapApiData<Record<string, unknown>>(current.data)
    const destructive = risk === "destructive"

    const approve = () => {
        if (destructive && !armed) return setArmed(true)
        onRespond({ id: part.approval.id, approved: true })
    }

    return (
        <div className={cn("rounded-lg border p-3 text-sm", destructive ? "border-destructive bg-destructive/5" : "border-primary/40 bg-primary/5")}>
            <div className="mb-2 flex items-center gap-2 font-medium">
                <ShieldAlertIcon className={cn("size-4", destructive ? "text-destructive" : "text-primary")} />
                {t("approvalTitle", { op: t(`ops.${op}`), resource: t(`resources.${resource}`) })}
            </div>
            <table className="w-full text-xs">
                <tbody>
                    {Object.entries(input)
                        .filter(([key]) => key !== "id")
                        .map(([key, value]) => (
                            <tr key={key} className="border-t">
                                <td className="py-1 pe-2 font-medium text-muted-foreground">{key}</td>
                                {fetchCurrent && (
                                    <td className="py-1 pe-2 line-through opacity-60" dir="auto">
                                        {formatValue(before[key])}
                                    </td>
                                )}
                                <td className="py-1" dir="auto">
                                    {formatValue(value)}
                                </td>
                            </tr>
                        ))}
                </tbody>
            </table>
            {rejecting ? (
                <div className="mt-3 flex flex-col gap-2">
                    <Textarea
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder={t("rejectReasonPlaceholder")}
                        rows={2}
                        dir="auto"
                    />
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => onRespond({ id: part.approval.id, approved: false, reason: reason.trim() || undefined })}
                        >
                            {t("confirmReject")}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>
                            {t("cancel")}
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="mt-3 flex gap-2">
                    <Button size="sm" variant={destructive ? "destructive" : "default"} onClick={approve}>
                        {destructive && armed ? t("confirmDestructive") : t("approve")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setRejecting(true)}>
                        {t("reject")}
                    </Button>
                </div>
            )}
        </div>
    )
}
