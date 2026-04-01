import { useMemo } from "react";
import { createApi } from "@garage/api";
import { useAuthStore } from "./stores/auth-store";

export const useAuthApi = () => {
    const token = useAuthStore(s => s.token)
    return useMemo(
        () => createApi({ headers: token ? { Authorization: `Bearer ${token}` } : undefined }),
        [token],
    )
}