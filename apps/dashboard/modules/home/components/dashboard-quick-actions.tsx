import Link from "next/link"
import {
    ReceiptIcon,
    ShoppingCartIcon,
    HandCoinsIcon,
    CreditCardIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"

const ACTIONS = [
    {
        key: "salesInvoice" as const,
        href: "/sales/invoices?action=create",
        icon: ReceiptIcon,
        hoverClass: "hover:border-emerald-500 hover:text-emerald-500",
    },
    {
        key: "purchaseInvoice" as const,
        href: "/purchases/invoices?action=create",
        icon: ShoppingCartIcon,
        hoverClass: "hover:border-blue-500 hover:text-blue-500",
    },
    {
        key: "receipt" as const,
        href: "/finance/payments?action=create&type=RECEIPT",
        icon: HandCoinsIcon,
        hoverClass: "hover:border-violet-500 hover:text-violet-500",
    },
    {
        key: "expense" as const,
        href: "/finance/expenses?action=create",
        icon: CreditCardIcon,
        hoverClass: "hover:border-amber-500 hover:text-amber-500",
    },
]

export function DashboardQuickActions() {
    const t = useTranslations("business.dashboard.quickActions")

    return (
        <div>
            <h2 className="text-lg font-semibold mb-3">{t("title")}</h2>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                {ACTIONS.map(({ key, href, icon: Icon, hoverClass }) => (
                    <Link
                        key={key}
                        href={href}
                        className={`flex h-24 flex-col items-center justify-center gap-2 rounded-lg border bg-card text-sm font-medium transition-colors ${hoverClass}`}
                    >
                        <Icon className="h-6 w-6" />
                        <span>{t(key)}</span>
                    </Link>
                ))}
            </div>
        </div>
    )
}
