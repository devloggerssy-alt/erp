const PENDING_TTL_MS = 15_000

type PendingFirstMessage = { text: string; at: number }

const pending = new Map<string, PendingFirstMessage>()

export function setPendingFirstMessage(conversationId: string, text: string): void {
    pending.set(conversationId, { text, at: Date.now() })
}

export function takePendingFirstMessage(conversationId: string): string | null {
    const entry = pending.get(conversationId)
    if (!entry) return null
    pending.delete(conversationId)
    return Date.now() - entry.at > PENDING_TTL_MS ? null : entry.text
}
