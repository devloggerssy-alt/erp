import { GetStoreAddressesResponse, SetStoreThemePayload, Store, StoreAddress, StoreLookup, StoreThemeResponse, UpsertStoreAddressContract, GetCategoriesResponse, UpdateMerchantStoreContract, STORE, CATEGORIES } from "@devloggers/contracts";
import { ApiService } from "../core/apiService";
import { jsonRequest } from "../utils/jsonRequest";

export class StoreApi extends ApiService {
    moduleName = 'store';
    getStoreLookup = () => {
        return this.get<StoreLookup>(STORE.LOOKUP);
    }

    getStoreGeneralInfo = () => {
        return this.get<Store>(STORE.GENERAL_INFO);
    }

    updateStore = (dto: UpdateMerchantStoreContract) => {
        return this.put<Store>(STORE.ROOT, jsonRequest(dto));
    }

    getStoreTheme = () => {
        return this.get<StoreThemeResponse>(STORE.THEME);
    }
    setStoreTheme = (dto: SetStoreThemePayload) => {
        return this.put<void>(STORE.THEME, jsonRequest(dto));
    };

    getStoreAddresses = () => {
        return this.get<GetStoreAddressesResponse>(STORE.ADDRESSES);
    }

    upsertStoreAddress = (dto: UpsertStoreAddressContract) => {
        return this.post<StoreAddress>(STORE.ADDRESSES, jsonRequest(dto));
    }

    deleteStoreAddress = (addressId: string) => {
        return this.delete<void>(STORE.ADDRESSES + '/' + addressId);
    }


    getStoreCategories = () => {
        return this.get<GetCategoriesResponse>(CATEGORIES.ROOT);
    }


}