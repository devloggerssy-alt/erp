import { createApi, } from "@devloggers/api-client";
 import { getAuthCookies } from "@/modules/auth/auth.actions";
import { CONSTANTS } from "@/config/constants";

export const getAuthApi = async () => {
    const { token } = await getAuthCookies();
    const api = createApi({ headers: token ? { Authorization: `Bearer ${token}` } : undefined }, CONSTANTS.apiUrl);
    return api;
}


