import type { DynamicToolUIPart, UIMessage } from "ai"

export type ToolRisk = "read" | "write" | "destructive"

type UIPart = UIMessage["parts"][number]

export type ApprovalRequestedPart = DynamicToolUIPart & { state: "approval-requested" }

export type ApprovalResponse = { id: string; approved: boolean; reason?: string }

export function isDynamicToolPart(part: UIPart): part is DynamicToolUIPart {
    return part.type === "dynamic-tool"
}

export function isApprovalRequested(part: DynamicToolUIPart): part is ApprovalRequestedPart {
    return part.state === "approval-requested"
}

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** Risk comes from the server's `data-toolMeta` part emitted next to each tool call. */
export function findToolRisk(message: UIMessage, toolCallId: string): ToolRisk {
    for (const part of message.parts) {
        if (part.type !== "data-toolMeta" || !("data" in part)) continue
        const data = part.data
        if (isRecord(data) && data.toolCallId === toolCallId) {
            const risk = data.risk
            if (risk === "write" || risk === "destructive" || risk === "read") return risk
        }
    }
    return "read"
}

/** `units.update` → { resource: "units", op: "update" } */
export function splitToolName(toolName: string): { resource: string; op: string } {
    const [resource = toolName, op = ""] = toolName.split(".")
    return { resource, op }
}

export function hasPendingApproval(message: UIMessage | undefined): boolean {
    return !!message?.parts.some((part) => isDynamicToolPart(part) && part.state === "approval-requested")
}
