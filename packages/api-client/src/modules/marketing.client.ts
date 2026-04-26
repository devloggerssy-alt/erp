import { ApiService } from "../core/apiService";
import {
    AddCollectionProductDto,
    BannerResponse,
    BannersResponse,
    CollectionProductResponse,
    CollectionProductsResponse,
    CollectionResponse,
    CollectionsResponse,
    CouponResponse,
    CouponsResponse,
    CreateBannerDto,
    CreateCollectionDto,
    CreateCouponDto,
    CreateHomepageSectionDto,
    CreatePageDto,
    CreatePromotionDto,
    HomepageSectionResponse,
    HomepageSectionsResponse,
    PageResponse,
    PagesResponse,
    PromotionResponse,
    PromotionsResponse,
    RemoveCollectionProductDto,
    RemoveCollectionProductsResponse,
    UpdateBannerDto,
    UpdateCollectionDto,
    UpdateCouponDto,
    UpdateHomepageSectionDto,
    UpdatePageDto,
    UpdatePromotionDto,
    UpdateReviewDto,
    ReviewsResponse,
    ReviewResponse,
    BANNERS,
    HOMEPAGE_SECTIONS,
    REVIEWS,
    COUPONS,
    PROMOTIONS,
    COLLECTIONS,
    UpdateManyHomepageSectionsDto,
    CollectionType,
    ApiQueryOptions
} from "@devloggers/contracts";

// Local types for banner sliders (kept in sync with backend/contracts)
type BannerSlidersResponse = any;
type BannerSliderResponse = any;

interface CreateBannerSliderDto {
    title: string;
    description?: string;
    banners: string[];
}

interface UpdateBannerSliderDto {
    title?: string;
    description?: string;
    banners?: string[];
}

const BANNER_SLIDERS_ROOT = "banner-sliders";
import { serializeQueryOptions } from "../utils/querySerializer";
import { HttpClientOptions } from "../core/fetchHttpClient";

const jsonRequest = (dto: unknown): Partial<HttpClientOptions> => ({
    body: JSON.stringify(dto) as BodyInit,
    headers: { "Content-Type": "application/json" } as Record<string, string>,
});

export class CollectionsApi extends ApiService {


    createOne = (dto: CreateCollectionDto) => {
        return this.post<CollectionResponse>(COLLECTIONS.ROOT, jsonRequest(dto));
    };

    getById = (collectionId: string) => {
        return this.get<CollectionResponse>(COLLECTIONS.ROOT + '/' + collectionId);
    };

    updateOne = (collectionId: string, dto: UpdateCollectionDto) => {
        return this.put<CollectionResponse>(COLLECTIONS.ROOT + '/' + collectionId, jsonRequest(dto));
    };

    deleteById = (collectionId: string) => {
        return this.delete<CollectionResponse>(COLLECTIONS.ROOT + '/' + collectionId);
    };

    listProducts = (collectionId: string) => {
        return this.get<CollectionProductsResponse>(COLLECTIONS.LIST_PRODUCTS(collectionId));
    };

    addProduct = (collectionId: string, dto: AddCollectionProductDto) => {
        return this.post<CollectionProductResponse>(
            COLLECTIONS.ADD_PRODUCT(collectionId),
            jsonRequest(dto),
        );
    };

    removeProducts = (collectionId: string, dto: RemoveCollectionProductDto) => {
        return this.post<RemoveCollectionProductsResponse>(
            COLLECTIONS.REMOVE_PRODUCTS(collectionId),
            jsonRequest(dto),
        );
    };

    getCollectionTypeProducts = (collectionType: CollectionType, query: ApiQueryOptions) => {
        return this.get<CollectionProductsResponse>(COLLECTIONS.COLLECTION_TYPE_PRODUCTS(collectionType), { query });
    };
}

export class BannersApi extends ApiService {
    createOne = (dto: CreateBannerDto) => {
        return this.post<BannerResponse>(BANNERS.ROOT, jsonRequest(dto));
    };

    getById = (bannerId: string) => {
        return this.get<BannerResponse>(BANNERS.ROOT + '/' + bannerId);
    };

    updateOne = (bannerId: string, dto: UpdateBannerDto) => {
        return this.put<BannerResponse>(BANNERS.ROOT + '/' + bannerId, jsonRequest(dto));
    };

    deleteById = (bannerId: string) => {
        return this.delete<BannerResponse>(BANNERS.ROOT + '/' + bannerId);
    };
}

export class BannerSlidersApi extends ApiService {
    createOne = (dto: CreateBannerSliderDto) => {
        return this.post<BannerSliderResponse>(BANNER_SLIDERS_ROOT, jsonRequest(dto));
    };

    getById = (sliderId: string) => {
        return this.get<BannerSliderResponse>(BANNER_SLIDERS_ROOT + '/' + sliderId);
    };

    updateOne = (sliderId: string, dto: UpdateBannerSliderDto) => {
        return this.put<BannerSliderResponse>(BANNER_SLIDERS_ROOT + '/' + sliderId, jsonRequest(dto));
    };

    deleteById = (sliderId: string) => {
        return this.delete<BannerSliderResponse>(BANNER_SLIDERS_ROOT + '/' + sliderId);
    };
}

export class HomepageSectionsApi extends ApiService {

    getAll = (query?: ApiQueryOptions) => {
        const queryString = query ? serializeQueryOptions(query) : '';
        const finalUrl = queryString ? `${HOMEPAGE_SECTIONS.ROOT}?${queryString}` : HOMEPAGE_SECTIONS.ROOT;
        return this.get<HomepageSectionsResponse>(finalUrl);
    };

    createOne = (dto: CreateHomepageSectionDto) => {
        return this.post<HomepageSectionResponse>(HOMEPAGE_SECTIONS.ROOT, jsonRequest(dto));
    };

    getById = (sectionId: string) => {
        return this.get<HomepageSectionResponse>(HOMEPAGE_SECTIONS.ROOT + '/' + sectionId);
    };

    updateOne = (sectionId: string, dto: UpdateHomepageSectionDto) => {
        return this.put<HomepageSectionResponse>(
            HOMEPAGE_SECTIONS.ROOT + '/' + sectionId,
            jsonRequest(dto),
        );
    };

    deleteById = (sectionId: string) => {
        return this.delete<HomepageSectionResponse>(HOMEPAGE_SECTIONS.ROOT + '/' + sectionId);
    };

    updateMany = (dto: UpdateManyHomepageSectionsDto[]) => {
        return this.put<any>(HOMEPAGE_SECTIONS.ROOT, jsonRequest(dto));
    }
}


export class ReviewsApi extends ApiService {


    updateOne = (reviewId: string, dto: UpdateReviewDto) => {
        return this.put<ReviewResponse>(REVIEWS.ROOT + '/' + reviewId, jsonRequest(dto));
    };

    deleteById = (reviewId: string) => {
        return this.delete<ReviewResponse>(REVIEWS.ROOT + '/' + reviewId);
    };
}

export class CouponsApi extends ApiService {

    createOne = (dto: CreateCouponDto) => {
        return this.post<CouponResponse>(COUPONS.ROOT, jsonRequest(dto));
    };

    getById = (couponId: string) => {
        return this.get<CouponResponse>(COUPONS.ROOT + '/' + couponId);
    };

    updateOne = (couponId: string, dto: UpdateCouponDto) => {
        return this.put<CouponResponse>(COUPONS.ROOT + '/' + couponId, jsonRequest(dto));
    };

    deleteById = (couponId: string) => {
        return this.delete<CouponResponse>(COUPONS.ROOT + '/' + couponId);
    };
}

export class PromotionsApi extends ApiService {


    createOne = (dto: CreatePromotionDto) => {
        return this.post<PromotionResponse>(PROMOTIONS.ROOT, jsonRequest(dto));
    };

    getById = (promotionId: string) => {
        return this.get<PromotionResponse>(PROMOTIONS.ROOT + '/' + promotionId);
    };

    updateOne = (promotionId: string, dto: UpdatePromotionDto) => {
        return this.put<PromotionResponse>(PROMOTIONS.ROOT + '/' + promotionId, jsonRequest(dto));
    };

    deleteById = (promotionId: string) => {
        return this.delete<PromotionResponse>(PROMOTIONS.ROOT + '/' + promotionId);
    };
}
