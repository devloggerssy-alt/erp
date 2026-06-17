export type ExpenseStatus = 'DRAFT' | 'POSTED' | 'CANCELLED'

export interface CreateExpenseItemDto {
  accountId: string
  description: string
  amount: number
  notes?: string | null
  sortOrder?: number
}

export interface CreateExpenseDto {
  date: string
  cashboxId: string
  currencyId: string
  fiscalPeriodId: string
  /** Exchange rate to tenant base currency. Defaults to 1 for base-currency expenses. */
  exchangeRate?: number
  notes?: string | null
  items: CreateExpenseItemDto[]
}

export interface UpdateExpenseDto {
  date?: string
  cashboxId?: string
  currencyId?: string
  fiscalPeriodId?: string
  exchangeRate?: number
  notes?: string | null
  items?: CreateExpenseItemDto[]
}

export interface ExpenseItemResponseDto {
  id: string
  accountId: string
  description: string
  amount: number
  notes: string | null
  sortOrder: number
}

export interface ExpenseResponseDto {
  id: string
  number: string
  date: string
  cashboxId: string
  currencyId: string
  fiscalPeriodId: string
  totalAmount: number
  status: ExpenseStatus
  notes: string | null
  journalEntryId: string | null
  items: ExpenseItemResponseDto[]
  createdAt: string
  updatedAt: string
}
