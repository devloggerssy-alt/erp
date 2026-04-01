import { AuthApi } from '../modules/auth.client'
import { ApiRegistry } from './apiRegistry'
import { ApiClient } from './apiClient'
import { StoreApi } from '../modules/store.client'
import { ProductsApi } from '../modules/products.client'
import {
    BannersApi,
    BannerSlidersApi,
    CategoriesApi,
    CollectionsApi,
    CouponsApi,
    HomepageSectionsApi,
    PromotionsApi,
    ReviewsApi,
} from '../modules'
import { CommonApi } from '../modules/common.client'
import { AUTH, BANNERS, BANNER_SLIDERS, CATEGORIES, COLLECTIONS, COMMON, COUPONS, HOMEPAGE_SECTIONS, ORDERS, PAYMENT_METHODS, PRODUCTS, PROMOTIONS, REVIEWS, STORE } from '@devloggers/contracts'
import { toCamelCase } from '../utils/toCamelCase'
import { PaymentMethodsApi } from '../modules/payment-methods.client'
import { OrdersApi } from '../modules/orders.client'

export type ModulesRegistryType = {
    auth: AuthApi;
    collections: CollectionsApi;
    banners: BannersApi;
    bannerSliders: BannerSlidersApi;
    homepageSections: HomepageSectionsApi;
    reviews: ReviewsApi;
    coupons: CouponsApi;
    promotions: PromotionsApi;
    products: ProductsApi;
    categories: CategoriesApi;
    store: StoreApi;
    common: CommonApi;
    paymentMethods: PaymentMethodsApi;
    orders: OrdersApi;
}

export type ApiKey = keyof ModulesRegistryType;

export const createApiRegistry = (apiClient: ApiClient) => {
    const registry = new ApiRegistry(apiClient);

    const modules = {
        [AUTH.ROOT]: new AuthApi(apiClient, AUTH.ROOT),
        [COLLECTIONS.ROOT]: new CollectionsApi(apiClient, COLLECTIONS.ROOT),
        [BANNERS.ROOT]: new BannersApi(apiClient, BANNERS.ROOT),
        [BANNER_SLIDERS.ROOT]: new BannerSlidersApi(apiClient, BANNER_SLIDERS.ROOT),
        [HOMEPAGE_SECTIONS.ROOT]: new HomepageSectionsApi(apiClient, HOMEPAGE_SECTIONS.ROOT),
        [REVIEWS.ROOT]: new ReviewsApi(apiClient, REVIEWS.ROOT),
        [COUPONS.ROOT]: new CouponsApi(apiClient, COUPONS.ROOT),
        [PROMOTIONS.ROOT]: new PromotionsApi(apiClient, PROMOTIONS.ROOT),
        [PRODUCTS.ROOT]: new ProductsApi(apiClient, PRODUCTS.ROOT),
        [CATEGORIES.ROOT]: new CategoriesApi(apiClient, CATEGORIES.ROOT),
        [STORE.ROOT]: new StoreApi(apiClient, STORE.ROOT),
        [COMMON.ROOT]: new CommonApi(apiClient, COMMON.ROOT),
        [PAYMENT_METHODS.ROOT]: new PaymentMethodsApi(apiClient, PAYMENT_METHODS.ROOT),
        [ORDERS.ROOT]: new OrdersApi(apiClient, ORDERS.ROOT),
    } as const;

    Object.entries(modules).forEach(([key, api]) => {
        const camelKey = toCamelCase(key) as keyof ModulesRegistryType;
        registry.register(api, camelKey);
    });

    return registry as unknown as ApiRegistry<ModulesRegistryType>;
}
