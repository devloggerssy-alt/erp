import { CrudClient } from "../infra/crud-client"
import type { ApiClientOptions } from "../infra/client"
import type { ApiPath } from "../infra/types"

export const EMPLOYEE_ROUTES = {
    INDEX: "/api/employees",
    BY_ID: "/api/employees/{id}",
} as const satisfies Record<string, ApiPath>

export class EmployeesClient extends CrudClient<
    typeof EMPLOYEE_ROUTES.INDEX,
    typeof EMPLOYEE_ROUTES.BY_ID
> {
    constructor(baseUrl?: string, defaultOptions?: ApiClientOptions) {
        super(baseUrl, defaultOptions, EMPLOYEE_ROUTES.INDEX, EMPLOYEE_ROUTES.BY_ID)
    }
}
