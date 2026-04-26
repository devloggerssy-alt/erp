import { Order } from "@devloggers/db-prisma";
import { ApiService } from "../core/apiService";
import { CreateOrderContract, ORDERS } from "@devloggers/contracts";
import { ApiClient } from "../core/apiClient";

export class OrdersApi extends ApiService<Order, Order, CreateOrderContract> {
    constructor(apiClient: ApiClient, moduleName: string = ORDERS.ROOT) {
        super(apiClient, ORDERS.ROOT);
    }
}