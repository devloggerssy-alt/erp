import { COMMON, GetCategoriesResponse } from "@devloggers/contracts";
import { ApiService } from "../core/apiService";

export class CommonApi extends ApiService {
    moduleName = 'common';
    getStoreCategories = () => {
        return this.get<GetCategoriesResponse>(COMMON.BUSINESS_CATEGORIES);
    }
}