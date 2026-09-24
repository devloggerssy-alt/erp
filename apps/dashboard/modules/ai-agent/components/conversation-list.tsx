"use client"

import { MoreHorizontalIcon, PlusIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { useRouter } from "@/i18n/navigation"
import { Button } from "@/shared/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { confirm } from "@/shared/components/confirm-dialog"
import { cn, toastErrorMessage } from "@/shared/lib/utils"
import { useConversationMutations, useConversations } from "../hooks/use-conversations"

export function ConversationList({ activeId }: { activeId?: string }) {
    const t = useTranslations("business.aiAgent")
    const router = useRouter()
    const conversations = useConversations()
    const { create, rename, remove } = useConversationMutations()
    const items = conversations.data?.pages.flatMap((page) => page.data?.items ?? []) ?? []

    const onNew = async () => {
        try {
            const created = await create.mutateAsync()
            if (created.data) router.push(`/ai/${created.data.id}`)
        } catch (error) {
            toast.error(toastErrorMessage(error, t("actionFailed")))
        }
    }

    const onRename = (id: string, current: string | null) => {
        const title = window.prompt(t("renamePrompt"), current ?? "")
        if (title?.trim()) rename.mutate({ id, title: title.trim() })
    }

    const onDelete = async (id: string) => {
        const ok = await confirm({ title: t("deleteTitle"), description: t("deleteDescription"), variant: "destructive" })
        if (!ok) return
        try {
            await remove.mutateAsync(id)
            if (id === activeId) router.push("/ai")
        } catch (error) {
            toast.error(toastErrorMessage(error, t("actionFailed")))
        }
    }

    return (
        <aside className="flex h-full w-full flex-col gap-2 border-e p-2 md:w-72">
            <Button onClick={() => void onNew()} disabled={create.isPending} className="w-full justify-start gap-2">
                <PlusIcon className="size-4" />
                {t("newConversation")}
            </Button>
            <nav className="flex-1 overflow-y-auto">
                {items.length === 0 && !conversations.isLoading && (
                    <p className="p-3 text-sm text-muted-foreground">{t("noConversations")}</p>
                )}
                {items.map((conversation) => (
                    <div
                        key={conversation.id}
                        className={cn(
                            "group flex items-center gap-1 rounded-md pe-1 hover:bg-muted",
                            conversation.id === activeId && "bg-muted",
                        )}
                    >
                        <button
                            type="button"
                            onClick={() => router.push(`/ai/${conversation.id}`)}
                            className="flex-1 truncate px-3 py-2 text-start text-sm"
                            dir="auto"
                        >
                            {conversation.title ?? t("untitled")}
                        </button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                                    aria-label={t("actions")}
                                >
                                    <MoreHorizontalIcon className="size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onRename(conversation.id, conversation.title)}>{t("rename")}</DropdownMenuItem>
                                <DropdownMenuItem variant="destructive" onClick={() => void onDelete(conversation.id)}>
                                    {t("delete")}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                ))}
                {conversations.hasNextPage && (
                    <Button variant="ghost" className="w-full" onClick={() => void conversations.fetchNextPage()}>
                        {t("loadMore")}
                    </Button>
                )}
            </nav>
        </aside>
    )
}
