import type { ApiClientOptions } from "./infra/client"
import { AuthClient } from "./clients/auth"
import { CustomersClient } from "./clients/customers"
import { ReferralSourcesClient } from "./clients/referral-sources"
import { VehiclesClient } from "./clients/vehicles"
import { VehicleAttributesClient } from "./clients/vehicle-attributes"
import { VehicleDocumentsClient } from "./clients/vehicle-documents"
import { DepartmentsClient } from "./clients/departments"
import { EmployeesClient } from "./clients/employees"
import { GeoClient } from "./clients/geo"
import { PaymentTermsClient } from "./clients/payment-terms"
import { ShopTypesClient } from "./clients/shop-types"
import { InventoryClient } from "./clients/inventory"
import { VendorsClient } from "./clients/vendors"
import { InspectionsClient } from "./clients/inspections"
import { LabelsClient } from "./clients/labels"
import { InsuranceTypesClient } from "./clients/insurance-types"
import { EstimatesClient } from "./clients/estimates"
import { JobCardsClient } from "./clients/job-cards"
import { PaymentsClient } from "./clients/payments"
import { PartsClient } from "./clients/parts"
import { PurchaseOrdersClient } from "./clients/purchase-orders"
import { ServicesClient } from "./clients/services"
import { ServiceGroupsClient } from "./clients/service-groups"
import { ExpensesClient } from "./clients/expenses"
import { TasksClient } from "./clients/tasks"
import { AppointmentsClient } from "./clients/appointments"
import { ShopTimingsClient } from "./clients/shop-timings"
import { ShopCalendarsClient } from "./clients/shop-calendars"
import { HolidayYearsClient } from "./clients/holiday-years"
import { TaxesClient } from "./clients/taxes"
import { InvoicesClient } from "./clients/invoices"
import { HomeClient } from "./clients/home"

export function createApi(options?: ApiClientOptions) {
    return {
        auth: new AuthClient(undefined, options),
        customers: new CustomersClient(undefined, options),
        referralSources: new ReferralSourcesClient(undefined, options),
        vehicles: new VehiclesClient(undefined, options),
        vehicleAttributes: new VehicleAttributesClient(undefined, options),
        vehicleDocuments: new VehicleDocumentsClient(undefined, options),
        departments: new DepartmentsClient(undefined, options),
        employees: new EmployeesClient(undefined, options),
        geo: new GeoClient(undefined, options),
        paymentTerms: new PaymentTermsClient(undefined, options),
        shopTypes: new ShopTypesClient(undefined, options),
        inventory: new InventoryClient(undefined, options),
        vendors: new VendorsClient(undefined, options),
        inspections: new InspectionsClient(undefined, options),
        labels: new LabelsClient(undefined, options),
        insuranceTypes: new InsuranceTypesClient(undefined, options),
        estimates: new EstimatesClient(undefined, options),
        jobCards: new JobCardsClient(undefined, options),
        payments: new PaymentsClient(undefined, options),
        parts: new PartsClient(undefined, options),
        purchaseOrders: new PurchaseOrdersClient(undefined, options),
        services: new ServicesClient(undefined, options),
        serviceGroups: new ServiceGroupsClient(undefined, options),
        expenses: new ExpensesClient(undefined, options),
        tasks: new TasksClient(undefined, options),
        appointments: new AppointmentsClient(undefined, options),
        shopTimings: new ShopTimingsClient(undefined, options),
        shopCalendars: new ShopCalendarsClient(undefined, options),
        holidayYears: new HolidayYearsClient(undefined, options),
        taxes: new TaxesClient(undefined, options),
        invoices: new InvoicesClient(undefined, options),
        home: new HomeClient(undefined, options),
    }
}

/** Unauthenticated singleton — use for public calls (login, register) */
export const api = createApi()
