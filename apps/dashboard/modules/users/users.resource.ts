import { generateResource } from "@/shared/data-view/resource"
import { type UsersClient } from "@devloggers/api-client"

export const UsersResource = generateResource<UsersClient>({
    getClient: (api) => api.users,
    paramKey: "users",
    list: {
        searchIn: ["fullName", "email"],
        defaultSort: { field: "fullName", order: "asc" },
    },
})
