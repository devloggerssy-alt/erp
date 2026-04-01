import { ApiService } from "../core/apiService";
import { SetStorePaymentMethodContract, PAYMENT_METHODS, PaymentMethod, StorePaymentConfig, ApiQueryOptions, ApiResponse } from "@devloggers/contracts";
import { serializeQueryOptions } from "../utils/querySerializer";
import type { HttpClientOptions } from "../core/fetchHttpClient";

export class PaymentMethodsApi extends ApiService<StorePaymentConfig & { method: PaymentMethod }> {
    getSystemPaymentMethods = () => {
        return this.get<PaymentMethod[]>(PAYMENT_METHODS.SYSTEM);
    }

    setPaymentMethodForStore = (dto: SetStorePaymentMethodContract & { methodId: string }) => {
        return this.put<StorePaymentConfig & { method: PaymentMethod }>(`${PAYMENT_METHODS.ROOT}/${dto.methodId}`, {
            body: JSON.stringify(dto),
        });
    }

    getStorePaymentMethods = () => {
        return this.get<Array<StorePaymentConfig & { method: PaymentMethod }>>(`${PAYMENT_METHODS.ROOT}`);
    }

    // Override getList to use merchant route for store payment methods
    getList = <RT = Array<StorePaymentConfig & { method: PaymentMethod }>>(query?: ApiQueryOptions, options?: Partial<HttpClientOptions>, url?: string) => {
        const baseUrl = PAYMENT_METHODS.ROOT;
        const queryString = query ? serializeQueryOptions(query) : '';
        const finalUrl = queryString ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${queryString}` : baseUrl;
        return this.apiClient.fetch<RT>(finalUrl, {
            method: "GET",
            ...options
        }) as Promise<ApiResponse<RT>>;
    }
}