"use client"

import { PanelLeftIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"
import { useRouter } from "@/i18n/navigation"
import { Button } from "@/shared/components/ui/button"
import { toastErrorMessage } from "@/shared/lib/utils"
import { useConversationMutations } from "../hooks/use-conversations"
import { setPendingFirstMessage } from "../pending-first-message"
import { Composer } from "./composer"

export function NewChatView({ onOpenList }: { onOpenList?: () => void }) {
    const t = useTranslations("business.aiAgent")
    const router = useRouter()
    const { create } = useConversationMutations()
    const [text, setText] = useState("")

    const send = async (value: string) => {
        try {
            const created = await create.mutateAsync()
            const id = created.data?.id
            if (!id) {
                toast.error(t("actionFailed"))
                return
            }
            setPendingFirstMessage(id, value)
            setText("")
            router.replace(`/ai/${id}`)
        } catch (error) {
            toast.error(toastErrorMessage(error, t("actionFailed")))
        }
    }

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col">
            {onOpenList && (
                <div className="p-2 md:hidden">
                    <Button variant="ghost" size="icon" onClick={onOpenList} aria-label={t("openConversations")}>
                        <PanelLeftIcon className="size-4" />
                    </Button>
                </div>
            )}
            <div className="flex flex-1 items-center justify-center p-4">
                <div className="w-full max-w-2xl space-y-4">
                    <h1 className="text-center text-2xl font-semibold">{t("newChatTitle")}</h1>
                    <Composer
                        value={text}
                        onValueChange={setText}
                        disabled={create.isPending}
                        busy={false}
                        onSend={(message) => void send(message)}
                        onStop={() => undefined}
                    />
                </div>
            </div>
        </div>
    )
}
