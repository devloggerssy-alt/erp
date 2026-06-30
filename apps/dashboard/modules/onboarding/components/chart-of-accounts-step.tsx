"use client"

import { useMutation } from "@tanstack/react-query"
import { Button } from "@/shared/components/ui/button"
import { onboardingApi } from "../onboarding.config"

const COA_PREVIEW = [
    { code: "1000", name: "Assets",        children: ["1100 Current Assets", "1200 Non-Current Assets"] },
    { code: "2000", name: "Liabilities",   children: ["2100 Current Liabilities", "2200 Non-Current Liabilities"] },
    { code: "3000", name: "Equity",        children: ["3100 Owner's Equity", "3200 Retained Earnings"] },
    { code: "4000", name: "Revenue",       children: ["4100 Sales Revenue", "4200 Other Revenue"] },
    { code: "5000", name: "Cost of Sales", children: ["5100 Cost of Goods Sold"] },
    { code: "6000", name: "Expenses",      children: ["6100 Operating Expenses", "6200 Administrative Expenses"] },
]

type Props = { onSuccess: (codeToId: Record<string, string>) => void; token: string }

export function ChartOfAccountsStep({ onSuccess, token }: Props) {
    const { mutate, isPending, error } = useMutation({
        mutationFn: () => onboardingApi.stepChartOfAccounts(token),
        onSuccess: (data) => onSuccess(data.codeToId),
    })

    return (
        <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
                We'll create a standard chart of accounts for you. You can add or rename accounts later.
            </p>

            <div className="border rounded-lg divide-y">
                {COA_PREVIEW.map((group) => (
                    <div key={group.code} className="p-3 space-y-1">
                        <div className="font-medium text-sm">{group.code} — {group.name}</div>
                        <div className="ps-4 space-y-0.5">
                            {group.children.map((child) => (
                                <div key={child} className="text-xs text-muted-foreground">{child}</div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {error && <p className="text-sm text-destructive">{error.message}</p>}

            <Button onClick={() => mutate()} disabled={isPending} className="w-full">
                {isPending ? "Creating accounts…" : "Confirm & Continue →"}
            </Button>
        </div>
    )
}
