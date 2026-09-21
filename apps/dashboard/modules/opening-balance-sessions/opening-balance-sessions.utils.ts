export type OpeningSessionDimension = "CASHBOX" | "BANK_ACCOUNT" | "PARTY" | "ACCOUNT"
export type OpeningSessionPartySide = "AR" | "AP"

export type OpeningSessionLineBody = {
  dimension: OpeningSessionDimension
  accountId?: string | null
  partyId?: string | null
  cashboxId?: string | null
  bankAccountId?: string | null
  currencyId?: string | null
  partySide?: OpeningSessionPartySide | null
  amount: number
  exchangeRate?: number
}

export type CreateOpeningSessionBody = {
  fiscalPeriodId: string
  description?: string
  lines: OpeningSessionLineBody[]
}

export type UpdateOpeningSessionBody = {
  description?: string
  lines?: OpeningSessionLineBody[]
}

/** Structural shape of a line returned by the session `show` endpoint (fields optional because nullable OpenAPI properties generate as `?:`). */
export type SessionLineSource = {
  dimension: string
  accountId?: string | null
  partyId?: string | null
  cashboxId?: string | null
  bankAccountId?: string | null
  currencyId?: string | null
  partySide?: string | null
  amount: number | string
  exchangeRate?: number | string
}

export type EditableSessionLine = {
  key: string
  dimension: OpeningSessionDimension
  accountId: string
  partyId: string
  cashboxId: string
  bankAccountId: string
  currencyId: string
  partySide: OpeningSessionPartySide | ""
  amount: string
  exchangeRate: string
}

let lineKeySeed = 0

function nextLineKey(): string {
  lineKeySeed += 1
  return `line-${lineKeySeed}`
}

const DIMENSIONS: OpeningSessionDimension[] = ["CASHBOX", "BANK_ACCOUNT", "PARTY", "ACCOUNT"]

function normalizeDimension(dimension: string): OpeningSessionDimension {
  return DIMENSIONS.includes(dimension as OpeningSessionDimension)
    ? (dimension as OpeningSessionDimension)
    : "ACCOUNT"
}

export function newLineForDimension(dimension: OpeningSessionDimension): EditableSessionLine {
  return {
    key: nextLineKey(),
    dimension,
    accountId: "",
    partyId: "",
    cashboxId: "",
    bankAccountId: "",
    currencyId: "",
    partySide: dimension === "PARTY" ? "AR" : "",
    amount: "",
    exchangeRate: "1",
  }
}

export function linesFromSession(lines: SessionLineSource[]): EditableSessionLine[] {
  return lines.map((line) => ({
    key: nextLineKey(),
    dimension: normalizeDimension(line.dimension),
    accountId: line.accountId ?? "",
    partyId: line.partyId ?? "",
    cashboxId: line.cashboxId ?? "",
    bankAccountId: line.bankAccountId ?? "",
    currencyId: line.currencyId ?? "",
    partySide: line.partySide === "AR" || line.partySide === "AP" ? line.partySide : "",
    amount: String(line.amount ?? ""),
    exchangeRate: String(line.exchangeRate ?? 1),
  }))
}

export function isLineComplete(line: EditableSessionLine): boolean {
  const amount = Number(line.amount)
  const rate = Number(line.exchangeRate)
  if (!Number.isFinite(amount) || amount === 0) return false
  if (!Number.isFinite(rate) || rate <= 0) return false

  switch (line.dimension) {
    case "CASHBOX":
      return Boolean(line.cashboxId && line.currencyId)
    case "BANK_ACCOUNT":
      return Boolean(line.bankAccountId && line.currencyId)
    case "PARTY":
      return Boolean(line.partyId && line.currencyId && line.partySide)
    case "ACCOUNT":
      return Boolean(line.accountId)
  }
}

export function toLineBodies(lines: EditableSessionLine[]): OpeningSessionLineBody[] {
  return lines.map((line) => ({
    dimension: line.dimension,
    accountId: line.dimension === "ACCOUNT" ? line.accountId || null : null,
    partyId: line.dimension === "PARTY" ? line.partyId || null : null,
    cashboxId: line.dimension === "CASHBOX" ? line.cashboxId || null : null,
    bankAccountId: line.dimension === "BANK_ACCOUNT" ? line.bankAccountId || null : null,
    currencyId: line.dimension === "ACCOUNT" ? null : line.currencyId || null,
    partySide: line.dimension === "PARTY" ? line.partySide || null : null,
    amount: Number(line.amount),
    exchangeRate: Number(line.exchangeRate) || 1,
  }))
}

export function groupLinesByDimension(
  lines: EditableSessionLine[],
): Record<OpeningSessionDimension, EditableSessionLine[]> {
  const groups: Record<OpeningSessionDimension, EditableSessionLine[]> = {
    CASHBOX: [],
    BANK_ACCOUNT: [],
    PARTY: [],
    ACCOUNT: [],
  }
  for (const line of lines) {
    groups[line.dimension].push(line)
  }
  return groups
}

export function sumEnteredByCurrency(lines: EditableSessionLine[]): { currencyId: string; total: number }[] {
  const totals = new Map<string, number>()
  for (const line of lines) {
    const amount = Number(line.amount)
    if (!Number.isFinite(amount)) continue
    const key = line.dimension === "ACCOUNT" ? "" : line.currencyId
    totals.set(key, (totals.get(key) ?? 0) + amount)
  }
  return [...totals.entries()].map(([currencyId, total]) => ({
    currencyId,
    total: Math.round(total * 10000) / 10000,
  }))
}

export type PostingStep = "validate" | "review" | "post"

export function postingStepsFor(status: string): PostingStep[] {
  switch (status) {
    case "DRAFT":
      return ["validate", "review", "post"]
    case "VALIDATED":
      return ["review", "post"]
    case "REVIEWED":
      return ["post"]
    default:
      return []
  }
}
