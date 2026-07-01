import { useApi } from "@devloggers/api-client/react";
import { useQuery } from "@tanstack/react-query";

export const useSettingsQuery = () => {
    const api = useApi();

    return useQuery({
        queryKey: [api["financial-settings"].key],
        queryFn: () => Promise.all([
            api['tenants'].getSettings(),
            api['financial-settings'].get()
        ]),

        select: ([tenantRes, financialRes]) => ({
            ...tenantRes,
            ...financialRes
        })
    })

}
