import { ApiService } from "../core/apiService"
import {
    CloneCategoriesDto,
    GetCategoriesResponse,
    CreateCategoryDto,
    UpdateCategoryDto,
    CategoryResponse,
    DeleteCategoryResponse,
    CATEGORIES
} from "@devloggers/contracts";

export class CategoriesApi extends ApiService {
    getBaseCategories = () => {
        try {

            const res = this.get<GetCategoriesResponse>(CATEGORIES.BASE);
            return res;
        }

        catch (er) {
            throw (er)
        }
    }

    cloneForStore = (dto: CloneCategoriesDto) => {
        return this.post<GetCategoriesResponse>(CATEGORIES.CLONE, {
            body: JSON.stringify(dto),
            headers: { 'Content-Type': 'application/json' }
        });
    }

    getStoreCategories = () => {
        return this.getList<GetCategoriesResponse>();
    }

    createStoreCategory = (dto: CreateCategoryDto) => {
        return this.post<CategoryResponse>(CATEGORIES.ROOT, {
            body: JSON.stringify(dto),
            headers: { 'Content-Type': 'application/json' }
        });
    }

    getStoreCategoryById = (categoryId: string) => {
        return this.get<CategoryResponse>(CATEGORIES.ROOT + '/' + categoryId);
    }

    updateStoreCategory = (categoryId: string, dto: UpdateCategoryDto) => {
        return this.put<CategoryResponse>(CATEGORIES.ROOT + '/' + categoryId, {
            body: JSON.stringify(dto),
            headers: { 'Content-Type': 'application/json' }
        });
    }

    deleteStoreCategory = (categoryId: string) => {
        return this.delete<DeleteCategoryResponse>(CATEGORIES.ROOT + '/' + categoryId);
    }
}