"use client"

import { useTranslations } from "next-intl"
import { ConversationList } from "./conversation-list"
import { ChatView } from "./chat-view"

/** Header (`DashboardHeader`) is `h-12`; the chat fills the rest of the viewport. */
export function AiAgentPage({ conversationId }: { conversationId?: string }) {
    const t = useTranslations("business.aiAgent")
    return (
        <div className="flex h-[calc(100dvh-3rem)] min-h-0 flex-col md:flex-row">
            <div className={conversationId ? "hidden md:flex" : "flex flex-1 md:flex-none"}>
                <ConversationList activeId={conversationId} />
            </div>
            {conversationId ? (
                <ChatView conversationId={conversationId} />
            ) : (
                <div className="hidden flex-1 items-center justify-center text-muted-foreground md:flex">{t("emptyState")}</div>
            )}
        </div>
    )
}
