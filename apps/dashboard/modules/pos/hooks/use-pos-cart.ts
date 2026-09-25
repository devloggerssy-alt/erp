"use client"

import { useCallback, useMemo, useState } from "react"
import type { PosCartLine } from "../pos.config"
import { computeCartTotals } from "../pos.config"

export function usePosCart() {
    const [lines, setLines] = useState<PosCartLine[]>([])

    const addItem = useCallback((item: Omit<PosCartLine, "quantity" | "discountPercent">) => {
        setLines((prev) => {
            const existing = prev.find((l) => l.itemId === item.itemId && l.unitId === item.unitId)
            if (existing) {
                return prev.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l))
            }
            return [...prev, { ...item, quantity: 1, discountPercent: 0 }]
        })
    }, [])

    const setQuantity = useCallback((itemId: string, quantity: number) => {
        setLines((prev) =>
            prev
                .map((l) => (l.itemId === itemId ? { ...l, quantity: Math.max(0, quantity) } : l))
                .filter((l) => l.quantity > 0),
        )
    }, [])

    const setDiscountPercent = useCallback((itemId: string, discountPercent: number) => {
        setLines((prev) =>
            prev.map((l) =>
                l.itemId === itemId ? { ...l, discountPercent: Math.min(100, Math.max(0, discountPercent)) } : l,
            ),
        )
    }, [])

    const removeItem = useCallback((itemId: string) => {
        setLines((prev) => prev.filter((l) => l.itemId !== itemId))
    }, [])

    const clear = useCallback(() => setLines([]), [])

    const totals = useMemo(() => computeCartTotals(lines), [lines])

    return { lines, addItem, setQuantity, setDiscountPercent, removeItem, clear, totals }
}
