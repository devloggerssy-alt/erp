"use client"

import type { UIMessage } from "ai"
import { memo } from "react"
import { cn } from "@/shared/lib/utils"
import { findToolRisk, isApprovalRequested, isDynamicToolPart, type ApprovalResponse } from "../ai-agent.types"
import { TextPart } from "./parts/text-part"
import { ToolCallCard } from "./parts/tool-call-card"
import { ToolApprovalCard } from "./parts/tool-approval-card"

function MessageItemBase({ message, onApprovalResponse }: { message: UIMessage; onApprovalResponse: (response: ApprovalResponse) => void }) {
    const isUser = message.role === "user"
    return (
        <div className={cn("flex w-full px-4 py-2", isUser ? "justify-end" : "justify-start")}>
            <div className={cn("flex max-w-[min(48rem,90%)] flex-col gap-2", isUser && "rounded-2xl bg-primary px-4 py-2 text-primary-foreground")}>
                {message.parts.map((part, index) => {
                    if (part.type === "text") return <TextPart key={index} text={part.text} />
                    if (isDynamicToolPart(part)) {
                        if (isApprovalRequested(part)) {
                            return (
                                <ToolApprovalCard
                                    key={part.toolCallId}
                                    part={part}
                                    risk={findToolRisk(message, part.toolCallId)}
                                    onRespond={onApprovalResponse}
                                />
                            )
                        }
                        return <ToolCallCard key={part.toolCallId} part={part} />
                    }
                    return null
                })}
            </div>
        </div>
    )
}

/** useChat replaces only the changed message object, so reference equality skips unchanged rows while streaming. */
export const MessageItem = memo(MessageItemBase)
