import { posResource } from "@devloggers/api-contracts"
import type {
    CreatePosCheckoutDto,
    PosCheckoutResponseDto,
    PosSettingResponseDto,
    UpdatePosSettingDto,
} from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"

export class PosClient {
    readonly key = posResource.key

    constructor(private readonly apiClient: ApiClient) {}

    checkout = (dto: CreatePosCheckoutDto) =>
        this.apiClient.post(posResource.routes.checkout, dto) as Promise<{ data: PosCheckoutResponseDto }>

    getSettings = () =>
        this.apiClient.get(posResource.routes.settings) as Promise<{ data: PosSettingResponseDto | null }>

    updateSettings = (dto: UpdatePosSettingDto) =>
        this.apiClient.patch(posResource.routes.settings, dto) as Promise<{ data: PosSettingResponseDto }>

    provision = () =>
        this.apiClient.post(posResource.routes.provision, undefined) as Promise<{ data: PosSettingResponseDto }>
}
