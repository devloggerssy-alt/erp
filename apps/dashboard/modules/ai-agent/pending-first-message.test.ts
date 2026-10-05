import { afterEach, describe, expect, it, vi } from "vitest"
import { setPendingFirstMessage, takePendingFirstMessage } from "./pending-first-message"

describe("pending-first-message", () => {
    afterEach(() => {
        vi.useRealTimers()
    })

    it("returns the text once, then null", () => {
        setPendingFirstMessage("conversation-1", "hello")
        expect(takePendingFirstMessage("conversation-1")).toBe("hello")
        expect(takePendingFirstMessage("conversation-1")).toBeNull()
    })

    it("returns null for an unknown conversation", () => {
        expect(takePendingFirstMessage("missing")).toBeNull()
    })

    it("drops entries older than the TTL", () => {
        vi.useFakeTimers()
        setPendingFirstMessage("conversation-1", "hello")
        vi.advanceTimersByTime(15_001)
        expect(takePendingFirstMessage("conversation-1")).toBeNull()
    })
})
