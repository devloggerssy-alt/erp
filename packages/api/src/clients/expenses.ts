import { ApiClient, type ApiClientOptions } from "../infra/client"
import type { ApiPath, ApiRequestBody } from "../infra/types"
import type { ApiListQueryParams } from "../contracts/types"

export const EXPENSE_ROUTES = {
    INDEX: "/api/expenses",
    BY_ID: "/api/expenses/{id}",
    ITEMS: "/api/expense-items",
    ITEM_BY_ID: "/api/expense-items/{id}",
    TOGGLE_ITEM_STATUS: "/api/toggle-expense-item-status",
    BILLS: "/api/bills",
    BILL_BY_ID: "/api/bills/{id}",
    EXPENSES: "/api/expenses",
    EXPENSE_BY_ID: "/api/expenses/{id}",
} as const satisfies Record<string, ApiPath>

export class ExpensesClient extends ApiClient {
    constructor(baseUrl?: string, defaultOptions?: ApiClientOptions) {
        super(baseUrl, defaultOptions)
    }

    // ── Expense Items ──
    async listItems(query?: ApiListQueryParams) {
        return this.get(EXPENSE_ROUTES.ITEMS, query ? { query } as never : undefined)
    }

    async createItem(payload: ApiRequestBody<typeof EXPENSE_ROUTES.ITEMS, "post">) {
        return this.post(EXPENSE_ROUTES.ITEMS, payload)
    }

    async updateItem(id: string, payload: ApiRequestBody<typeof EXPENSE_ROUTES.ITEM_BY_ID, "put">) {
        return this.put(EXPENSE_ROUTES.ITEM_BY_ID, payload, { params: { id } })
    }

    async destroyItem(id: string) {
        return this.delete(EXPENSE_ROUTES.ITEM_BY_ID, { params: { id } })
    }

    async toggleItemStatus(payload: ApiRequestBody<typeof EXPENSE_ROUTES.TOGGLE_ITEM_STATUS, "post">) {
        return this.post(EXPENSE_ROUTES.TOGGLE_ITEM_STATUS, payload)
    }

    // ── Bills ──
    async listBills(query?: ApiListQueryParams) {
        return this.get(EXPENSE_ROUTES.BILLS, query ? { query } as never : undefined)
    }

    async createBill(payload: ApiRequestBody<typeof EXPENSE_ROUTES.BILLS, "post">) {
        return this.post(EXPENSE_ROUTES.BILLS, payload)
    }

    async updateBill(id: string, payload: ApiRequestBody<typeof EXPENSE_ROUTES.BILL_BY_ID, "put">) {
        return this.put(EXPENSE_ROUTES.BILL_BY_ID, payload, { params: { id } })
    }

    async destroyBill(id: string) {
        return this.delete(EXPENSE_ROUTES.BILL_BY_ID, { params: { id } })
    }

    // ── Expenses ──
    async listExpenses(query?: ApiListQueryParams) {
        return this.get(EXPENSE_ROUTES.EXPENSES, query ? { query } as never : undefined)
    }

    async createExpense(payload: ApiRequestBody<typeof EXPENSE_ROUTES.EXPENSES, "post">) {
        return this.post(EXPENSE_ROUTES.EXPENSES, payload)
    }

    async updateExpense(id: string, payload: ApiRequestBody<typeof EXPENSE_ROUTES.EXPENSE_BY_ID, "put">) {
        return this.put(EXPENSE_ROUTES.EXPENSE_BY_ID, payload, { params: { id } })
    }

    async destroyExpense(id: string) {
        return this.delete(EXPENSE_ROUTES.EXPENSE_BY_ID, { params: { id } })
    }

    // ── Standard CRUD aliases (for ResourcePage compatibility) ──
    async list(query?: ApiListQueryParams) {
        return this.listExpenses(query)
    }

    async create(payload: ApiRequestBody<typeof EXPENSE_ROUTES.EXPENSES, "post">) {
        return this.createExpense(payload)
    }

    async update(id: string, payload: ApiRequestBody<typeof EXPENSE_ROUTES.EXPENSE_BY_ID, "put">) {
        return this.updateExpense(id, payload)
    }

    async destroy(id: string) {
        return this.destroyExpense(id)
    }
}
