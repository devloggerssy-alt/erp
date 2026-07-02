import { format } from "date-fns"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/shared/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/shared/components/ui/table"
import { Badge } from "@/shared/components/ui/badge"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useTranslations, useLocale } from "next-intl"
import { useDashboardMovements } from "../hooks"

function resolveLocalizedName(name: unknown, locale: string): string {
    if (typeof name === "string") return name
    if (name && typeof name === "object") {
        const n = name as Record<string, string>
        return n[locale] ?? n["ar"] ?? n["en"] ?? ""
    }
    return ""
}

const TYPE_VARIANT: Record<string, "default" | "destructive" | "secondary"> = {
    RECEIPT: "default",
    PAYMENT: "destructive",
    ADJUSTMENT: "secondary",
}

export function DashboardRecentPayments() {
    const t = useTranslations("business.dashboard.recentPayments")
    const locale = useLocale()
    const { data, isLoading } = useDashboardMovements()

    const payments = (data as any)?.data ?? []

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("title")}</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full" />
                        ))}
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("date")}</TableHead>
                                <TableHead>{t("number")}</TableHead>
                                <TableHead>{t("type")}</TableHead>
                                <TableHead>{t("cashbox")}</TableHead>
                                <TableHead className="text-end">{t("amount")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payments.map((payment: any) => (
                                <TableRow key={payment.id}>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {format(new Date(payment.date), "MMM d, yyyy")}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {payment.number}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={TYPE_VARIANT[payment.type] ?? "secondary"}>
                                            {t(payment.type?.toLowerCase() as "receipt" | "payment" | "adjustment")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {resolveLocalizedName(payment.cashbox?.name, locale) || "—"}
                                    </TableCell>
                                    <TableCell className="text-end font-bold">
                                        {new Intl.NumberFormat(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        }).format(Number(payment.amount))}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    )
}
