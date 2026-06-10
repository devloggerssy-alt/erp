import { AuthClient } from "./clients/auth.client"
import { UnitsClient } from "./clients/units.client"
import { ApiClient, type ApiClientOptions } from "./infra/client"
import { CategoriesClient } from "./clients/categories.client"
import { WarehousesClient } from "./clients/warehouses.client"
import { PartiesClient } from "./clients/parties.client"
import { AccountsClient } from "./clients/account.client"
import { CurrenciesClient } from "./clients/currencies.client"
import { FiscalPeriodsClient } from "./clients/fiscal-periods.client"
import { DocumentSequencesClient } from "./clients/document-sequences.client"
import { RolesClient } from "./clients/roles.client"
import { UsersClient } from "./clients/users.client"
import { TenantsClient } from "./clients/tenants.client"
import { ItemsClient } from "./clients/items.client"
import { InvoiceTypesClient } from "./clients/invoice-types.client"
import { InvoicesClient } from "./clients/invoices.client"
import { ExpensesClient } from "./clients/expenses.client"
import { authResource, itemCategoryResource, itemResource, unitResource, warehouseResource, partyResource, accountResource, currencyResource, fiscalPeriodResource, documentSequenceResource, roleResource, userResource, tenantResource, invoiceTypeResource, invoiceResource, customFieldResource, expenseResource } from "@devloggers/api-contracts"
import { CustomFieldsClient } from "./clients/custom-fields.client"

export function createApi(options?: ApiClientOptions, baseUrl = 'http://localhost:4040') {
    const client = new ApiClient(baseUrl, options)
    return {
        client,
        [authResource.key]: new AuthClient(client),
        [unitResource.key]: new UnitsClient(client),
        [itemCategoryResource.key]: new CategoriesClient(client),
        [itemResource.key]: new ItemsClient(client),
        [customFieldResource.key]: new CustomFieldsClient(client),
        [warehouseResource.key]: new WarehousesClient(client),
        [partyResource.key]: new PartiesClient(client),
        [accountResource.key]: new AccountsClient(client),
        [currencyResource.key]: new CurrenciesClient(client),
        [fiscalPeriodResource.key]: new FiscalPeriodsClient(client),
        [documentSequenceResource.key]: new DocumentSequencesClient(client),
        [roleResource.key]: new RolesClient(client),
        [userResource.key]: new UsersClient(client),
        [tenantResource.key]: new TenantsClient(client),
        [invoiceTypeResource.key]: new InvoiceTypesClient(client),
        [invoiceResource.key]: new InvoicesClient(client),
        [expenseResource.key]: new ExpensesClient(client),
    } as const
}


export type Api = ReturnType<typeof createApi>

export const api = createApi(undefined, process.env.NEXT_PUBLIC_API_BASE_URL)

