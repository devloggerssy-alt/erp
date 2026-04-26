import { ApiClient } from "../core/apiClient";
import { ApiService } from "../core/apiService";
import type {
    CreateProductOptionContract,
    UpdateProductOptionContract,
    ProductOptionResponse,
    CreateOptionValueContract,
    UpdateOptionValueContract,
    OptionValueResponse,
    CreateProductVariantContract,
    UpdateProductVariantContract,
    ProductVariantResponse,
    AssignProductOptionContract,
    ProductWithOptionsResponse,
    ApiResponse,
    ApiQueryOptions,
    ProductWithVariants,
} from "@devloggers/contracts";
import { jsonRequest } from "../utils/jsonRequest";

export class ProductsApi extends ApiService<ProductWithVariants> {
    constructor(apiClient: ApiClient, moduleName: string = 'products') {
        super(apiClient, moduleName);
    }




    // =================== PRODUCT OPTIONS ===================

    /**
     * Create a new product option
     * @merchant
     */
    async createProductOption(data: CreateProductOptionContract): Promise<ApiResponse<ProductOptionResponse>> {
        return this.post('product-options', jsonRequest(data));
    }

    /**
     * Get all product options for the merchant's store
     * @merchant
     */
    async getProductOptions(query?: ApiQueryOptions): Promise<ApiResponse<ProductOptionResponse[]>> {
        return this.get('product-options', { query: query });
    }

    /**
     * Get a specific product option by ID
     * @merchant
     */
    async getProductOptionById(optionId: string): Promise<ApiResponse<ProductOptionResponse>> {
        return this.get(`product-options/${optionId}`);
    }

    /**
     * Update a product option
     * @merchant
     */
    async updateProductOption(optionId: string, data: UpdateProductOptionContract): Promise<ApiResponse<ProductOptionResponse>> {
        return this.put(`product-options/${optionId}`, jsonRequest(data));
    }

    /**
     * Delete a product option
     * @merchant
     */
    async deleteProductOption(optionId: string): Promise<ApiResponse<null>> {
        return this.delete(`product-options/${optionId}`);
    }

    // =================== OPTION VALUES ===================

    /**
     * Create a new option value
     * @merchant
     */
    async createOptionValue(optionId: string, data: Omit<CreateOptionValueContract, 'optionId'>): Promise<ApiResponse<OptionValueResponse>> {
        return this.post(`product-options/${optionId}/values`, jsonRequest(data));
    }

    /**
     * Get all values for a specific option
     * @merchant
     */
    async getOptionValues(optionId: string): Promise<ApiResponse<OptionValueResponse[]>> {
        return this.get(`product-options/${optionId}/values`);
    }

    /**
     * Get a specific option value by ID
     * @merchant
     */
    async getOptionValueById(optionId: string, valueId: string): Promise<ApiResponse<OptionValueResponse>> {
        return this.get(`product-options/${optionId}/values/${valueId}`);
    }

    /**
     * Update an option value
     * @merchant
     */
    async updateOptionValue(optionId: string, valueId: string, data: UpdateOptionValueContract): Promise<ApiResponse<OptionValueResponse>> {
        return this.put(`product-options/${optionId}/values/${valueId}`, jsonRequest(data));
    }

    /**
     * Delete an option value
     * @merchant
     */
    async deleteOptionValue(optionId: string, valueId: string): Promise<ApiResponse<null>> {
        return this.delete(`product-options/${optionId}/values/${valueId}`);
    }

    // =================== PRODUCT-OPTION ASSIGNMENT ===================

    /**
     * Assign options to a product
     * @merchant
     */
    async assignOptionsToProduct(productId: string, data: AssignProductOptionContract): Promise<ApiResponse<ProductWithOptionsResponse>> {
        return this.post(`products/${productId}/assign-options`, jsonRequest(data));
    }

    /**
     * Get options assigned to a product
     * @merchant
     */
    async getAssignedProductOptions(productId: string): Promise<ApiResponse<ProductWithOptionsResponse['productOptions']>> {
        return this.get(`products/${productId}/options`);
    }

    // =================== PRODUCT VARIANTS ===================

    /**
     * Create a new product variant
     * @merchant
     */
    async createProductVariant(productId: string, data: Omit<CreateProductVariantContract, 'productId'>): Promise<ApiResponse<ProductVariantResponse>> {
        return this.post(`products/${productId}/variants`, jsonRequest(data));
    }

    /**
     * Get all variants for a product (merchant)
     * @merchant
     */
    async getProductVariants(productId: string, query?: ApiQueryOptions): Promise<ApiResponse<ProductVariantResponse[]>> {
        return this.get(`products/${productId}/variants`, { query: query });
    }

    /**
     * Get a specific product variant by ID (merchant)
     * @merchant
     */
    async getProductVariantById(productId: string, variantId: string): Promise<ApiResponse<ProductVariantResponse>> {
        return this.get(`products/${productId}/variants/${variantId}`);
    }

    /**
     * Update a product variant
     * @merchant
     */
    async updateProductVariant(productId: string, variantId: string, data: UpdateProductVariantContract): Promise<ApiResponse<ProductVariantResponse>> {
        return this.put(`products/${productId}/variants/${variantId}`, jsonRequest(data));
    }

    /**
     * Delete a product variant
     * @merchant
     */
    async deleteProductVariant(productId: string, variantId: string): Promise<ApiResponse<null>> {
        return this.delete(`products/${productId}/variants/${variantId}`);
    }

    /**
     * Generate missing variants for a product
     * @merchant
     */
    async generateMissingVariants(productId: string): Promise<ApiResponse<{ created: number; message?: string }>> {
        return this.post(`products/${productId}/variants/generate-missing`, jsonRequest({}));
    }

    /**
     * Regenerate all variants for a product
     * @merchant
     */
    async regenerateAllVariants(productId: string): Promise<ApiResponse<{ message: string; count: number }>> {
        return this.post(`products/${productId}/variants/regenerate`, jsonRequest({}));
    }

    // =================== PUBLIC PRODUCT VARIANTS ===================

    /**
     * Get all public/active variants for a product
     * @public
     */
    async getPublicProductVariants(productId: string, query?: ApiQueryOptions): Promise<ApiResponse<ProductVariantResponse[]>> {
        return this.get(`/public/products/${productId}/variants`, { query: query });
    }

    /**
     * Get a specific public product variant by ID
     * @public
     */
    async getPublicProductVariantById(productId: string, variantId: string): Promise<ApiResponse<ProductVariantResponse>> {
        return this.get(`/public/products/${productId}/variants/${variantId}`);
    }

    async getProductBySlug(slug: string) {
        return this.getOne<ProductWithVariants>(slug);
    }
}   