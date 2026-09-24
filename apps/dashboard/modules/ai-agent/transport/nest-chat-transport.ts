import { DefaultChatTransport, type UIMessage } from "ai"
import type { ChatRequestBody } from "@devloggers/api-client"
import { isDynamicToolPart } from "../ai-agent.types"

/**
 * The server keeps the history; send only the new user text or the approval decisions.
 *
 * `messageId` is the message the SDK is submitting for (v7 passes the approval
 * message's id, which is not necessarily the last message); defaults to the last one.
 */
export function buildChatRequestBody(messages: UIMessage[], messageId?: string): ChatRequestBody {
    const target = (messageId ? messages.find((message) => message.id === messageId) : undefined) ?? messages[messages.length - 1]
    if (!target) throw new Error("No message to send")

    if (target.role === "user") {
        const text = target.parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n")
        return { message: { id: target.id, text } }
    }

    const approvals = target.parts.flatMap((part) =>
        isDynamicToolPart(part) && part.state === "approval-responded"
            ? [{ toolCallId: part.toolCallId, approved: part.approval.approved, reason: part.approval.reason }]
            : [],
    )
    return { approvals }
}

export function createNestChatTransport(getTarget: () => { url: string; headers: Record<string, string> }) {
    return new DefaultChatTransport<UIMessage>({
        prepareSendMessagesRequest: ({ messages, messageId }) => {
            const target = getTarget()
            return { api: target.url, headers: target.headers, body: buildChatRequestBody(messages, messageId) }
        },
    })
}
