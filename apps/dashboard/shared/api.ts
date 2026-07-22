import { createApi, } from "@devloggers/api-client";
 import { getAuthCookies } from "@/modules/auth/auth.actions";
import { CONSTANTS } from "@/config/constants";

export const getAuthApi = async () => {
    const { token } = await getAuthCookies();
    console.log(`Auth Token: ${token}`);
    const api = createApi({ headers: token ? { Authorization: `Bearer ${token}` } : undefined }, CONSTANTS.apiUrl);
    return api;
}


