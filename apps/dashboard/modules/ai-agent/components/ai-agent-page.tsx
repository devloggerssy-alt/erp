"use client"

import { useState } from "react"
import { useRouter } from "@/i18n/navigation"
import { ConversationList } from "./conversation-list"
import { ChatView } from "./chat-view"
import { NewChatView } from "./new-chat-view"

/** Header (`DashboardHeader`) is `h-12`; the chat fills the rest of the viewport. */
export function AiAgentPage({ conversationId }: { conversationId?: string }) {
    const router = useRouter()
    const [mobileListOpen, setMobileListOpen] = useState(false)

    if (conversationId) {
        return (
            <div className="flex h-[calc(100dvh-3rem)] min-h-0 flex-col md:flex-row">
                <div className="hidden md:flex">
                    <ConversationList activeId={conversationId} />
                </div>
                <ChatView conversationId={conversationId} />
            </div>
        )
    }

    return (
        <div className="flex h-[calc(100dvh-3rem)] min-h-0 flex-col md:flex-row">
            <div className={mobileListOpen ? "flex flex-1 md:flex-none" : "hidden md:flex"}>
                <ConversationList
                    onNew={() => {
                        setMobileListOpen(false)
                        router.push("/ai")
                    }}
                />
            </div>
            <div className={mobileListOpen ? "hidden md:flex md:flex-1" : "flex flex-1"}>
                <NewChatView onOpenList={() => setMobileListOpen(true)} />
            </div>
        </div>
    )
}
