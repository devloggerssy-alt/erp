import { userResource } from "@devloggers/api-contracts"
import { ApiClient, CrudClient, type BaseCrudItem } from "../infra"

type UserItem = BaseCrudItem & {
  email: string
  fullName: string
  phone: string | null
  isActive: boolean
  lastLoginAt: string | null
  roles: { id: string; name: string }[]
  createdAt: string
}

type UserListResponse = { data?: ReadonlyArray<UserItem>; meta?: unknown }

export class UsersClient extends CrudClient<typeof userResource> {
  constructor(apiClient: ApiClient) {
    super(apiClient, userResource)
  }

  override list(query?: Record<string, unknown>): Promise<UserListResponse> {
    return super.list(query) as any
  }
}
