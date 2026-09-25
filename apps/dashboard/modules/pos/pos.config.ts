export interface PosCartLine {
    itemId: string
    itemName: string
    unitId: string
    unitLabel: string
    unitPrice: number
    quantity: number
    discountPercent: number
    availableQuantity?: number
}

export interface PosCartTotals {
    subtotal: number
    discountAmount: number
    total: number
}

export function computeCartTotals(lines: PosCartLine[]): PosCartTotals {
    let subtotal = 0
    let discountAmount = 0

    for (const line of lines) {
        const lineSubtotal = line.quantity * line.unitPrice
        const lineDiscount = lineSubtotal * ((line.discountPercent || 0) / 100)
        subtotal += lineSubtotal
        discountAmount += lineDiscount
    }

    return { subtotal, discountAmount, total: subtotal - discountAmount }
}
