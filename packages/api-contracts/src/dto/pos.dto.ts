export interface PosCheckoutLineDto {
    itemId: string
    unitId: string
    quantity: number
    unitPrice: number
    /** Always sent, even when 0 — the generated OpenAPI type treats this field
     *  as non-optional because the backend DTO declares a Swagger `default`. */
    discountPercent: number
}

export interface CreatePosCheckoutDto {
    partyId?: string | null
    lines: PosCheckoutLineDto[]
    tendered: number
    clientRequestId: string
    notes?: string | null
}

export interface PosCheckoutResponseDto {
    invoiceId: string
    invoiceNumber: string
    paymentId: string
    paymentNumber: string
    total: number
    tendered: number
    change: number
    date: string
    replayed: boolean
}

export interface PosSettingResponseDto {
    id: string
    defaultPartyId: string
    defaultPartyName: string
    invoiceTypeId: string
    invoiceTypeName: string
    cashboxId: string
    cashboxName: string
    warehouseId: string
    warehouseName: string
    updatedAt: string
}

export interface UpdatePosSettingDto {
    cashboxId?: string
    warehouseId?: string
}
