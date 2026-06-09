import { ItemsEditPage } from "@/modules/items"

export default async function Page({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    return <ItemsEditPage itemId={id} />
}
