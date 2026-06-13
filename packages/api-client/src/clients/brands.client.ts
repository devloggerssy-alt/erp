import { brandResource } from '@devloggers/api-contracts'
import { ApiClient, CrudClient } from '../infra'

export class BrandsClient extends CrudClient<typeof brandResource> {
  constructor(apiClient: ApiClient) {
    super(apiClient, brandResource)
  }
}
