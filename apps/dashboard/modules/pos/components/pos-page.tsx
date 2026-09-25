"use client"

import { useState } from "react"
import DashboardPage from "@/infrastructure/components/layout/dashboard/dashboard-page"
import { usePosCart, usePosCheckout, usePosSettings } from "../hooks"
import { PosSetupCta } from "./pos-setup-cta"
import { PosProductGrid } from "./pos-product-grid"
import { PosCartPanel } from "./pos-cart-panel"
import { PosCustomerPicker } from "./pos-customer-picker"
import { PosReceiptDialog } from "./pos-receipt-dialog"

export function PosPage() {
    const { settings, isLoading } = usePosSettings()
    const cart = usePosCart()
    const checkout = usePosCheckout()
    const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null)
    const [tendered, setTendered] = useState(0)

    if (isLoading) return null
    if (!settings) return <PosSetupCta />

    async function handlePay() {
        await checkout.checkout({ lines: cart.lines, partyId: selectedPartyId, tendered })
        cart.clear()
        setTendered(0)
        setSelectedPartyId(null)
    }

    return (
        <DashboardPage>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <PosProductGrid warehouseId={settings.warehouseId} onAdd={cart.addItem} />
                </div>
                <div>
                    <PosCartPanel
                        lines={cart.lines}
                        totals={cart.totals}
                        tendered={tendered}
                        onTenderedChange={setTendered}
                        onQuantityChange={cart.setQuantity}
                        onDiscountChange={cart.setDiscountPercent}
                        onRemove={cart.removeItem}
                        onPay={handlePay}
                        isPending={checkout.isPending}
                        customerPicker={
                            <PosCustomerPicker
                                defaultPartyName={settings.defaultPartyName}
                                selectedPartyId={selectedPartyId}
                                onSelect={setSelectedPartyId}
                            />
                        }
                    />
                </div>
            </div>

            <PosReceiptDialog result={checkout.result} onClose={checkout.reset} />
        </DashboardPage>
    )
}
