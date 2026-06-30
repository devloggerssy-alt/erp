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
import { PaymentsClient } from "./clients/payments.client"
import { CashboxesClient } from "./clients/cashboxes.client"
import { TagsClient } from "./clients/tags.client"
import { TagAssignmentsClient } from "./clients/tag-assignments.client"
import { ItemRelationsClient } from "./clients/item-relations.client"
import { CatalogEntitiesClient } from "./clients/catalog-entities.client"
import { ItemCatalogEntitiesClient } from "./clients/item-catalog-entities.client"
import { BrandsClient } from "./clients/brands.client"
import { StockBalancesClient } from "./clients/stock-balances.client"
import { StockMovementsClient } from "./clients/stock-movements.client"
import { StockCountsClient } from "./clients/stock-counts.client"
import { FinancialSettingClient } from "./clients/financial-setting.client"
import { ReportsClient } from "./clients/reports.client"
import { authResource, itemCategoryResource, itemResource, unitResource, warehouseResource, partyResource, accountResource, currencyResource, fiscalPeriodResource, documentSequenceResource, roleResource, userResource, tenantResource, invoiceTypeResource, invoiceResource, customFieldResource, expenseResource, paymentResource, tagResource, tagAssignmentResource, itemRelationResource, catalogEntityResource, itemCatalogEntityResource, brandResource, inventoryResource, stockLedgerResource, stockCountResource, cashboxResource, financialSettingResource, reportResource } from "@devloggers/api-contracts"
import { CustomFieldsClient } from "./clients/custom-fields.client"
import { DashboardClient } from "./clients/dashboard.client"
import { OnboardingClient } from "./clients/onboarding.client"

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
        [userResource.key]: new UsersClient(client, userResource),
        [tenantResource.key]: new TenantsClient(client),
        [invoiceTypeResource.key]: new InvoiceTypesClient(client),
        [invoiceResource.key]: new InvoicesClient(client,invoiceResource),
        [cashboxResource.key]: new CashboxesClient(client,cashboxResource),
        [expenseResource.key]: new ExpensesClient(client),
        [paymentResource.key]: new PaymentsClient(client),
        [tagResource.key]: new TagsClient(client),
        [tagAssignmentResource.key]: new TagAssignmentsClient(client),
        [itemRelationResource.key]: new ItemRelationsClient(client),
        [catalogEntityResource.key]: new CatalogEntitiesClient(client),
        [itemCatalogEntityResource.key]: new ItemCatalogEntitiesClient(client),
        [brandResource.key]: new BrandsClient(client),
        [inventoryResource.key]: new StockBalancesClient(client),
        [stockLedgerResource.key]: new StockMovementsClient(client),
        [stockCountResource.key]: new StockCountsClient(client),
        [financialSettingResource.key]: new FinancialSettingClient(client),
        [reportResource.key]: new ReportsClient(client),
        dashboard: new DashboardClient(client),
        onboarding: new OnboardingClient(client),
    } as const
}


export type Api = ReturnType<typeof createApi>

export const api = createApi(undefined, process.env.NEXT_PUBLIC_API_BASE_URL)

