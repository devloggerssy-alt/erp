import { Injectable } from '@nestjs/common';
import { TenantResponseDto } from '../dto/tenant.dto';

type TenantEntity = {
    id: string;
    name: string;
    slug: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    logo: string | null;
    createdAt: Date;
    updatedAt: Date;
};

@Injectable()
export class TenantPresenter {
    toResponse(tenant: TenantEntity): TenantResponseDto {
        const dto = new TenantResponseDto();
        dto.id = tenant.id;
        dto.name = tenant.name;
        dto.slug = tenant.slug;
        dto.address = tenant.address;
        dto.phone = tenant.phone;
        dto.email = tenant.email;
        dto.logo = tenant.logo;
        dto.createdAt = tenant.createdAt.toISOString();
        dto.updatedAt = tenant.updatedAt.toISOString();
        return dto;
    }
}
