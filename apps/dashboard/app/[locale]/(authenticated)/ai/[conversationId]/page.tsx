import { AiAgentPage } from "@/modules/ai-agent"

export default async function Page({ params }: { params: Promise<{ conversationId: string }> }) {
    const { conversationId } = await params
    return <AiAgentPage conversationId={conversationId} />
}
