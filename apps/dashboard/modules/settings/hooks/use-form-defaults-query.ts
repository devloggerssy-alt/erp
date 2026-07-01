import { useApi } from "@devloggers/api-client/react";
import { tenantResource } from "@devloggers/api-contracts";
import {  useSuspenseQuery } from "@tanstack/react-query";

export const useFormDefaultsQuery = () => {
    const api = useApi();

    return useSuspenseQuery({
        queryKey: [tenantResource.routes.defaults],
        queryFn: () => api.tenants.getDefaults(),
        staleTime: 5 * 60 * 1000,
    });
};
