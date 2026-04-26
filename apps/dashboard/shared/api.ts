import { createApi, } from "@garage/api";
import { useAuthStore } from "./stores/auth-store";
import { getAuthCookies } from "@/modules/auth/auth.actions";

export const getAuthApi = async () => {
    const {  token } = await getAuthCookies();
    console.log(`Auth Token: ${token}`);
    const api = createApi({ headers: token ? { Authorization: `Bearer ${token}` } : undefined });
    return api;
}


